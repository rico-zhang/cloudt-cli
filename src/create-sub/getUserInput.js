import inquirer from 'inquirer';

export async function getUserInput() {
  const { createMode } = await getCreateMode();
  const { projectType } = await getProjectType();
  let prefixCls = '';
  let publicPath = '';
  let domin = ''; //域名
  const { projectName } = await getProjectName(createMode, projectType);
  if (createMode === 'auto') {
    domin = projectName.split('-').pop();
    prefixCls = `yst-${domin}`;
    publicPath = `/${domin}/`;
  } else {
    ({ prefixCls, publicPath } = await getPrefixClsPublicPath());
    domin = publicPath.replaceAll('/', '');
  }
  const { devPort } = await getDevPort();
  const { cloudtBranch, stdShareBranch } = await getCloudtStdShareBranch();
  const { autoNpmInstall } = await getAutoNpmInstall();
  // console.log(
  //   createMode,
  //   projectType,
  //   projectName,
  //   prefixCls,
  //   publicPath,
  //   devPort,
  //   domin,
  //   cloudtBranch,
  //   stdShareBranch,
  //   autoNpmInstall;
  // );
  return {
    projectType,
    domin,
    projectName,
    prefixCls,
    publicPath,
    devPort,
    cloudtBranch,
    stdShareBranch,
    autoNpmInstall,
  };
}
function getCreateMode() {
  return inquirer.prompt([
    {
      type: 'list',
      name: 'createMode',
      choices: [
        { value: 'auto', name: '自动 (根据子项目名解析出prefixCls,publicPath等)' },
        { value: 'manu', name: '手动 (可以指定prefixCls,publicPath等)' },
      ],
      message: '请选择创建模式: ',
    },
  ]);
}

function getProjectType() {
  return inquirer.prompt([
    {
      type: 'list',
      name: 'projectType',
      choices: [
        { value: 'standard', name: '标产' },
        { value: 'project', name: '项目' },
      ],
      message: '请选择子项目类型: ',
    },
  ]);
}

function getProjectName(createMode, projectType) {
  const message = `请输入子项目名称,格式为${
    projectType === 'standard' ? 'yst-clout-web-业务域名' : 'yst-项目简称-web-业务域名'
  },如${projectType === 'standard' ? 'yst-clout-web-support' : 'yst-lm-web-support'}: `;
  return inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: message,
      default: () => {
        return projectType === 'standard' ? 'yst-cloudt-web-' : '';
      },
      validate: (input) => {
        if (projectType === 'standard') {
          if (createMode === 'auto') {
            //自动模式要根据子项目名解析出最后一个单词作为publicPath prefixCls,所以对名称有严格规范，不能为yst-clout-web-after-sale(最后有两个单词了)
            const reg = /^yst-cloudt-web-(\w{2,10})$/g;
            const result = reg.test(input);
            if (!result) {
              return '工程名必须以【yst-cloudt-web-】开头,后跟一个业务域名单词(长度2-10),如yst-cloudt-web-support';
            }
          } else {
            //手动模式要自行指定publicPath prefixCls,所以对名称规范要求不严格，但是标产要求以yst-cloudt-web-开头；可以是yst-cloudt-web-after-sale
            const reg = /^yst-cloudt-web-.+$/g;
            const result = reg.test(input);
            if (!result) {
              return '工程名必须以【yst-cloudt-web-】开头,后跟业务域名标识,如yst-cloudt-web-support';
            }
          }
        } else {
          if (createMode === 'auto') {
            //自动模式要根据子项目名解析出最后一个单词作为publicPath prefixCls,所以对名称有严格规范，不能为yst-lm-web-after-sale(最后有两个单词了)
            const reg = /^yst-.+-web-(\w{2,10})$/g;
            const result = reg.test(input);
            if (!result) {
              return '工程名必须以【yst-项目简称-web-】开头,后跟一个业务域名单词(长度2-10),如yst-lm-web-support';
            }
          } else {
            //手动模式要自行指定publicPath prefixCls,所以对名称规范要求不严格，但是标产要求以yst-项目简称-web-开头；可以是yst-lm-web-after-sale
            const reg = /^yst-.+-web-.+$/g;
            const result = reg.test(input);
            if (!result) {
              return '工程名必须以【yst-项目简称-web-】开头,后跟业务域名标识,如yst-cloudt-web-support';
            }
          }
        }
        return true;
      },
    },
  ]);
}
function getPrefixClsPublicPath() {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'prefixCls',
      message: '请输入antd css 前缀;project.config.ts中的prefixCls,如yst-support: ',
    },
    {
      type: 'input',
      name: 'publicPath',
      message: '请输入publicPath;build.config.ts中的publicPath,如/support/: ',
      validate: (input) => {
        //必须以/开头 /结尾 中间的单词长度为2-10
        const reg = /^\/\w{2,10}\/$/g;
        const result = reg.test(input);
        if (!result) {
          return 'publicPath必须以/开头 /结尾 中间的单词长度为2-10,如/support/: ';
        }
        return true;
      },
    },
  ]);
}

function getDevPort() {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'devPort',
      message: '请输入子项目启动的端口号,如3020: ',
      validate: (input) => {
        if (!input || Number.isNaN(Number(input))) {
          return '请输入大于0的数字';
        }
        return true;
      },
    },
  ]);
}

function getCloudtStdShareBranch() {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'cloudtBranch',
      message: '请输入cloudt组件库分支名称(自动引入subtree),如果不需要，则直接回车: ',
    },
    {
      type: 'input',
      name: 'stdShareBranch',
      message: '请输入stdShare分支名称(自动引入subtree),如果不需要，则直接回车: ',
    },
  ]);
}

function getAutoNpmInstall() {
  return inquirer.prompt([
    {
      type: 'confirm',
      name: 'autoNpmInstall',
      message: '自动安装依赖?(y/n): ',
      default: true,
    },
  ]);
}
