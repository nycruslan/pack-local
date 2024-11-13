import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { Logger } from './logger.js';

export async function initConfig() {
  const configPath = path.resolve('pack-local.config.json');

  // Check if the configuration file already exists
  if (fs.existsSync(configPath)) {
    Logger.warn('Initialization has already been completed.');
    Logger.warn(`Configuration file already exists at ${configPath}.`);
    return;
  }

  // Prompt the user for package manager and path
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
      validate(input) {
        return fs.existsSync(input) ? true : 'Path does not exist';
      },
    },
  ]);

  // Save the user's choices to the config file
  const defaultConfig = {
    packagePath: answers.packagePath,
    packageManager: answers.packageManager,
  };

  fs.writeJsonSync(configPath, defaultConfig, { spaces: 2 });
  Logger.success(`Created configuration file at ${configPath}`);

  // Update package.json with "pack-local" script
  const packageJsonPath = path.resolve('package.json');
  if (!fs.existsSync(packageJsonPath)) {
    Logger.error('Error: package.json not found in the project root.');
    process.exit(1);
  }

  const packageJson = fs.readJsonSync(packageJsonPath);
  if (packageJson.scripts && packageJson.scripts['pack-local']) {
    Logger.warn('"pack-local" script already exists in package.json.');
  } else {
    packageJson.scripts = {
      ...packageJson.scripts,
      'pack-local': 'pack-local run',
    };
    fs.writeJsonSync(packageJsonPath, packageJson, { spaces: 2 });
    Logger.success('Added "pack-local" script to package.json.');
  }

  // Suggested next step
  Logger.info(
    'Initialization complete! You can now run the following command to start the pack and update process:\n\n' +
      '    npm run pack-local\n'
  );
}
