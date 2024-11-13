import fs from 'fs-extra';
import path from 'path';
import {
  removeOldTarballs,
  bumpPackVersion,
  buildPackage,
  packPackage,
  updateConsumingApp,
} from './utils.js';
import { Logger } from './logger.js';

export async function packAndUpdate() {
  const configPath = path.resolve('pack-local.config.json');

  if (!fs.existsSync(configPath)) {
    Logger.error(
      'Configuration file "pack-local.config.json" not found. Run "pack-local init" first.'
    );
    process.exit(1);
  }

  const config = fs.readJsonSync(configPath);
  const packagePath = path.resolve(config.packagePath);

  Logger.info('Starting the pack and update process...');

  removeOldTarballs(packagePath);
  const newVersion = bumpPackVersion(packagePath);
  Logger.success(`Updated version to ${newVersion} in package.json`);

  buildPackage(packagePath, config.packageManager);

  const tarballPath = packPackage(packagePath, config.packageManager);
  if (!tarballPath) {
    Logger.error('Failed to create tarball.');
    process.exit(1);
  }
  Logger.success(`Created tarball at ${tarballPath}`);

  const packageJson = fs.readJsonSync(path.join(packagePath, 'package.json'));
  updateConsumingApp(
    packageJson.name,
    tarballPath,
    config.packageManager,
    config.legacyPeerDeps
  );

  Logger.info('Pack and update process completed successfully.');
}
