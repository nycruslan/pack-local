import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import {
  removeOldTarballs,
  bumpPackVersion,
  buildPackage,
  packPackage,
  updateConsumingApp,
} from './utils.js';

export async function packAndUpdate() {
  const configPath = path.resolve('pack-local.config.json');
  if (!fs.existsSync(configPath)) {
    console.error(
      chalk.red(
        'Configuration file "pack-local.config.json" not found. Run "pack-local init" first.'
      )
    );
    process.exit(1);
  }

  const config = fs.readJsonSync(configPath);
  const packagePath = path.resolve(config.packagePath);

  console.log(chalk.blue('Starting the pack and update process...'));
  removeOldTarballs(packagePath);
  const newVersion = bumpPackVersion(packagePath);
  console.log(chalk.green(`Updated version to ${newVersion} in package.json`));

  buildPackage(packagePath, config.packageManager);
  const tarballPath = packPackage(packagePath, config.packageManager);
  console.log(chalk.green(`Created tarball at ${tarballPath}`));

  const packageJson = fs.readJsonSync(path.join(packagePath, 'package.json'));
  updateConsumingApp(packageJson.name, tarballPath, config.packageManager);
  console.log(chalk.blue('Pack and update process completed.'));
}
