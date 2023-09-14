import download from 'download-git-repo';
import shell from 'shelljs';
import fs from 'fs';
import path from 'path';
import ora from 'ora';
import chalk from 'chalk';
import logSymbols from 'log-symbols';
import { getUserInput } from './getUserInput.js';

const templateGitUrl = 'git@code.elitescloud.com:cloudt-web-suites/cloudt-web-ice2-template.git';

shell.config.silent = true;
shell.config.fatal = true;

//获取执行命令的路径
function getExecPath() {
  return process.cwd();
}

function logSuccess(msg) {
  console.log(logSymbols.success, chalk.green(msg));
}
function logError(msg) {
  console.log(logSymbols.error, chalk.red(msg));
}

function tryExec(func, params, msg, isLoading = true, isThrow = true) {
  let spinner = null;
  if (isLoading) {
    spinner = ora({
      text: msg,
      isSilent: true,
    }).start();
  }
  try {
    func.apply(null, params);
    logSuccess(`${msg} 成功`);
  } catch (error) {
    logError(`${msg} 失败`);
    if (isThrow) {
      throw error;
    }
  } finally {
    if (isLoading) {
      spinner.stop();
    }
  }
}

async function downloadTemplate(projectName) {
  return new Promise((resolve) => {
    const spinner = ora('下载模板工程').start();
    download(
      `direct:${templateGitUrl}#develop`,
      path.resolve(getExecPath(), projectName),
      { clone: true },
      function (err) {
        spinner.stop();
        if (err) {
          logError(`clone模板代码出错,请检查仓库权限，仓库地址，分支，及本地是否有不为空的${projectName}文件夹`);
          resolve(false);
        } else {
          logSuccess('模板工程下载成功');
          resolve(true);
        }
      }
    );
  });
}

function initGit(projectRootPath) {
  shell.cd(projectRootPath);
  shell.exec('git init');
  shell.exec('git branch -m main master');
  shell.exec('git add .');
  shell.exec('git commit -m "feat(init): init#0"');
  shell.exec('git switch -c dev');
}

function gitSubtreeCloudt(projectRootPath, cloudtBranch) {
  if (cloudtBranch) {
    const spinner = ora({ text: '添加cloudt组件库', isSilent: true }).start();
    try {
      shell.cd(projectRootPath);
      shell.rm('-rf', './src/cloudt'); //防止直接pull冲突 所以先删掉 再add
      shell.exec('git add .');
      shell.exec('git commit -m "feat(cloudt): delete cloudt#0"');
      shell.exec(
        `git subtree add --prefix=src/cloudt git@code.elitescloud.com:cloudt-web-suites/cloudt.git ${cloudtBranch} --squash`
      );
      logSuccess('添加cloudt组件库成功');
    } catch (error) {
      logError('添加cloudt组件库失败');
      throw error;
    } finally {
      spinner.stop();
    }
  } else {
    logSuccess('无需添加cloudt组件库');
  }
}
function gitSubtreeStdShare(projectRootPath, stdShareBranch) {
  if (stdShareBranch) {
    const spinner = ora({ text: '添加stdShare组件库', isSilent: true }).start();
    try {
      shell.cd(projectRootPath);
      shell.exec(
        `git subtree add --prefix=src/std-share git@code.elitescloud.com:el-yst-buzi-std/std-share.git ${stdShareBranch} --squash`
      );
      logSuccess('添加stdShare组件库成功');
    } catch (error) {
      logError('添加stdShare组件库失败');
      throw error;
    } finally {
      spinner.stop();
    }
  } else {
    logSuccess('无需添加stdShare组件库');
  }
}

function handlePublicIndexHtmlTitle(projectRootPath, projectName) {
  const filePath = path.resolve(projectRootPath, 'public/index.html');
  let content = fs.readFileSync(filePath).toString();
  content = content.replace('<title>cloudt-web-ice2-template</title>', `<title>${projectName}</title>`);
  fs.writeFileSync(filePath, content);
}

function createDemoPage(projectRootPath, projectName, domin, projectType) {
  let demoPageDir = `./src/pages/${projectType === 'standard' ? 'standard' : 'project'}/${domin}/Demo`;
  const demoPagePath = `${demoPageDir}/index.tsx`;
  const demoContent = `export default function Demo() {
return (
    <div>
      ${projectName}-demo
    </div>
  )
}`;
  shell.cd(projectRootPath);
  shell.mkdir('-p', demoPageDir);
  fs.writeFileSync(demoPagePath, demoContent);
}

function createDemoRoute(projectRootPath, domin, projectType) {
  let demoPagePath = `@/pages/${projectType === 'standard' ? 'standard' : 'project'}/${domin}/Demo`;
  let routerFileDir = `./src/routeFiles/${projectType === 'standard' ? 'standard' : 'project'}/${domin}`;
  const demoRoutePath = `${routerFileDir}/index.ts`;
  const demoRouterContent = `import { lazy } from 'ice';
const ${domin}Routers = [
  {
    path: '/${domin}',
    pageConfig: { title: '${domin}', key: '${domin}' },
    children: [
      {
        path: '/demo',
        pageConfig: { title: 'Demo', keepAlive: true, key: '${domin}-demo' },
        component: lazy(() => import('${demoPagePath}')),
      },
    ],
  },
];

export default ${domin}Routers;`;
  shell.cd(projectRootPath);
  shell.mkdir('-p', routerFileDir);
  fs.writeFileSync(demoRoutePath, demoRouterContent);
  if (projectType === 'standard') {
    const standardRouteContent = `import platform from './platform';
import ${domin} from './${domin}';
export default [...platform, ...${domin}];`;
    fs.writeFileSync('./src/routeFiles/standard/index.ts', standardRouteContent);
  } else {
    const standardRouteContent = `// import mes from './mes'
import ${domin} from './${domin}';
export default [
    // ...mes
    ...${domin}
];`;
    fs.writeFileSync('./src/routeFiles/project/index.ts', standardRouteContent);
  }
}

function handleAntdPrefixCls(projectRootPath, prefixCls) {
  const filePath = path.resolve(projectRootPath, 'src/project.config.ts');
  let content = fs.readFileSync(filePath).toString();
  content = content.replace("const prefixCls = 'cloudt-tmpl';", `const prefixCls = '${prefixCls}';`);
  fs.writeFileSync(filePath, content);
}

function handlePublicPath(projectRootPath, publicPath) {
  const filePath = path.resolve(projectRootPath, 'build.config.js');
  let content = fs.readFileSync(filePath).toString();
  content = content.replace("publicPath: '/template/',", `publicPath: '${publicPath}',`);
  fs.writeFileSync(filePath, content);
}

function handlePackageJson(projectRootPath, projectName, devPort, cloudtBranch, stdShareBranch) {
  const filePath = path.resolve(projectRootPath, 'package.json');
  let content = fs.readFileSync(filePath).toString();
  const jsonObj = JSON.parse(content);
  jsonObj.name = projectName;
  jsonObj.scripts.start = jsonObj.scripts.start.replace(3030, devPort);
  if (cloudtBranch) {
    jsonObj.scripts[
      'cloudt-add'
    ] = `git subtree add --prefix=src/cloudt git@code.elitescloud.com:cloudt-web-suites/cloudt.git ${cloudtBranch} --squash`;
    jsonObj.scripts[
      'cloudt-pull'
    ] = `git subtree pull --prefix=src/cloudt git@code.elitescloud.com:cloudt-web-suites/cloudt.git ${cloudtBranch} --squash`;
  }
  if (stdShareBranch) {
    jsonObj.scripts[
      'stdshare-add'
    ] = `git subtree add --prefix=src/std-share git@code.elitescloud.com:el-yst-buzi-std/std-share.git ${stdShareBranch} --squash`;
    jsonObj.scripts[
      'stdshare-pull'
    ] = `git subtree pull --prefix=src/std-share git@code.elitescloud.com:el-yst-buzi-std/std-share.git ${stdShareBranch} --squash`;
  }
  const jsonStr = JSON.stringify(jsonObj, null, 2);
  fs.writeFileSync(filePath, jsonStr);
}

function handleChart(projectRootPath, projectName) {
  shell.cd(projectRootPath);
  shell.mv('./chart/cloudt-web-ice2-template', `./chart/${projectName}`);
  const filePath = path.resolve(projectRootPath, `./chart/${projectName}/Chart.yaml`);
  let content = fs.readFileSync(filePath).toString();
  content = content.replace('name: cloudt-web-ice2-template', `name: ${projectName}`);
  fs.writeFileSync(filePath, content);
}

function npmInstall(projectRootPath) {
  shell.cd(projectRootPath);
  shell.exec('npm i');
}

//某个步骤失败后 需要清理已生成的文件
function clearProject(projectRootPath) {
  shell.rm('-rf', projectRootPath);
}

/**
 * @description 创建子项目
 * 1. 询问用户输入
 * 2. git clone 子项目模板代码 删除原.git文件夹
 * 3. 初始化git, 重命名master分支,commit master分支, 切换 dev分支
 * 4. 添加cloudt组件库(非必须)
 * 5. 添加stdShare组件库(非必须)
 * 6. 处理 public/index.html title
 * 7. 创建 demo页面
 * 8. 创建路由文件
 * 9. 更改antd css prefixCls (project.config.ts)
 * 10. 更改publicPath (build.config.js)
 * 11. 更改启动命令端口号, 更改cloudt命令，添加stdShare命令 (package.json)
 * 12. 更改Chart部署文件
 */
export async function createSub() {
  const { projectType, domin, projectName, prefixCls, publicPath, devPort, cloudtBranch, stdShareBranch } =
    await getUserInput();
  // const projectType = 'project';
  // const domin = 'support';
  // const projectName = 'yst-cloudt-web-support';
  // const prefixCls = 'yst-support';
  // const publicPath = '/support/';
  // const devPort = 3456;
  // const cloudtBranch = 'stable/3.2.x';
  // const stdShareBranch = 'master';
  const projectRootPath = path.resolve(getExecPath(), projectName);
  const downloadSuccess = await downloadTemplate(projectName);
  if (downloadSuccess) {
    let createSuccess = false;
    try {
      tryExec(initGit, [projectRootPath], '初始化git, 重命名master分支,commit master分支, 切换 dev分支');
      gitSubtreeCloudt(projectRootPath, cloudtBranch);
      gitSubtreeStdShare(projectRootPath, stdShareBranch);
      tryExec(handlePublicIndexHtmlTitle, [projectRootPath, projectName], '处理 public/index.html title');
      tryExec(createDemoPage, [projectRootPath, projectName, domin, projectType], '创建 demo页面');
      tryExec(createDemoRoute, [projectRootPath, domin, projectType], '创建路由文件');
      tryExec(handleAntdPrefixCls, [projectRootPath, prefixCls], '更改antd css prefixCls (project.config.ts)');
      tryExec(handlePublicPath, [projectRootPath, publicPath], '更改publicPath (build.config.js)');
      tryExec(
        handlePackageJson,
        [projectRootPath, projectName, devPort, cloudtBranch, stdShareBranch],
        '更改启动命令端口号, 更改cloudt命令，添加stdShare命令 (package.json)'
      );
      tryExec(handleChart, [projectRootPath, projectName], '更改Chart部署文件');
      logSuccess('子项目创建成功');
      createSuccess = true;
    } catch (error) {
      clearProject(projectRootPath);
      console.log(error.message);
    }
    if (createSuccess) {
      tryExec(npmInstall, [projectRootPath], 'npm install', true, false);
    }
  }
}
