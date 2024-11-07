import { Command } from 'commander';
import { initConfig } from './initConfig';
import { packAndUpdate } from './packAndUpdate';

const program = new Command();

program
  .name('pack-local')
  .description('A CLI tool for locally packing component libraries')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize configuration for local packing')
  .action(initConfig);

program
  .command('run')
  .description('Run the local pack process')
  .action(packAndUpdate);

program.parse(process.argv);
