#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { initConfig } from './initConfig.js';
import { packAndUpdate } from './packAndUpdate.js';
import { cleanup } from './utils.js';

const program = new Command();

program
  .name('pack-local')
  .description(
    chalk.green('A CLI tool for locally packing component libraries')
  )
  .version('1.0.0');

program
  .command('init')
  .description(chalk.blue('Initialize configuration for local packing'))
  .action(initConfig);

program
  .command('run')
  .description(chalk.blue('Run the local pack process'))
  .action(packAndUpdate);

program
  .command('cleanup')
  .description(chalk.blue('Remove pack-local configuration and scripts'))
  .action(cleanup);

program.parse(process.argv);
