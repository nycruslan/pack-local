import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { Logger } from './logger.js';

export async function initConfig() {
  const configPath = path.resolve('pack-local.config.json');

  if (fs.existsSync(configPath)) {
    Logger.warn('Initialization has already been completed.');
    Logger.warn(`Configuration file already exists at ${configPath}.`);
    return;
  }

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'packageManager',
      message: 'Choose a package manager:',
      choices: ['npm', 'yarn', 'pnpm'],
      default: 'npm',
    },
    {
      type: 'input',
      name: 'packagePath',
      message: 'Enter the path for the pack-local package:',
      default: './',
      validate: (input) =>
        fs.existsSync(input) ? true : 'Path does not exist',
    },
    {
      type: 'confirm',
      name: 'legacyPeerDeps',
      message: 'Run npm install with --legacy-peer-deps?',
      default: false,
    },
  ]);

  const defaultConfig = {
    packagePath: answers.packagePath,
    packageManager: answers.packageManager,
    legacyPeerDeps: answers.legacyPeerDeps,
  };

  fs.writeJsonSync(configPath, defaultConfig, { spaces: 2 });
  Logger.success(`Created configuration file at ${configPath}`);

  const packageJsonPath = path.resolve('package.json');
  if (!fs.existsSync(packageJsonPath)) {
    Logger.error('Error: package.json not found in the project root.');
    process.exit(1);
  }

  const packageJson = fs.readJsonSync(packageJsonPath);
  if (!packageJson.scripts?.['pack-local']) {
    packageJson.scripts = {
      ...packageJson.scripts,
      'pack-local': 'pack-local run',
    };
    fs.writeJsonSync(packageJsonPath, packageJson, { spaces: 2 });
    Logger.success('Added "pack-local" script to package.json.');
  } else {
    Logger.warn('"pack-local" script already exists in package.json.');
  }

  Logger.info(
    'Initialization complete! You can now run the following command to start the pack and update process:\n\n' +
      '    npm run pack-local\n'
  );
}
