import fs from 'fs-extra';
import path from 'path';
import { Logger } from './logger.js'; // Import the Logger utility

export async function initConfig() {
  const configPath = path.resolve('pack-local.config.json');
  const defaultConfig = {
    packagePath: './',
    packageManager: 'npm',
  };

  // Check if the configuration file already exists
  if (fs.existsSync(configPath)) {
    Logger.warn('Initialization has already been completed.');
    Logger.warn(`Configuration file already exists at ${configPath}.`);
    return;
  }

  // Create the configuration file
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
}
