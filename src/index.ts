#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { initConfig } from './initConfig.js';
import { packAndUpdate } from './packAndUpdate.js';
import { cleanup } from './utils.js';
import { Logger } from './logger.js';

const program = new Command();

program
  .name('pack-local')
  .description(
    chalk.greenBright(
      '[pack-local] A CLI tool for locally packing component libraries'
    )
  )
  .version('1.0.0');

const commands = [
  {
    name: 'init',
    description: chalk.blueBright(
      '[pack-local] Initialize configuration for local packing'
    ),
    action: () => {
      Logger.info('Initializing configuration...');
      initConfig();
      Logger.success('Configuration initialized successfully.');
    },
  },
  {
    name: 'run',
    description: chalk.blueBright('[pack-local] Run the local pack process'),
    action: () => {
      Logger.info('Running the local pack process...');
      packAndUpdate();
      Logger.success('Local pack process completed successfully.');
    },
  },
  {
    name: 'cleanup',
    description: chalk.blueBright(
      '[pack-local] Remove pack-local configuration and scripts'
    ),
    action: () => {
      Logger.info('Starting cleanup process...');
      cleanup();
      Logger.success('Cleanup process completed successfully.');
    },
  },
];

commands.forEach(({ name, description, action }) => {
  program.command(name).description(description).action(action);
});

program.parse(process.argv);
