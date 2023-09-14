#!/usr/bin/env node
import { program } from 'commander';
import { createSub } from './src/create-sub/index.js';

program.version('1.0.0', '-v, --version');
program
  .command('create-sub')
  .description('创建子项目')
  .action(() => {
    createSub();
  });

program.parse();
