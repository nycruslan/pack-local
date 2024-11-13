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

  // Check for configuration file
  if (!fs.existsSync(configPath)) {
    Logger.error(
      'Configuration file "pack-local.config.json" not found. Run "pack-local init" first.'
    );
    process.exit(1);
  }

  const config = fs.readJsonSync(configPath);
  const packagePath = path.resolve(config.packagePath);

  Logger.info('Starting the pack and update process...');

  // Remove old tarballs
  removeOldTarballs(packagePath);

  // Bump version
  const newVersion = bumpPackVersion(packagePath);
  Logger.success(`Updated version to ${newVersion} in package.json`);

  // Build package
  buildPackage(packagePath, config.packageManager);

  // Pack package
  const tarballPath = packPackage(packagePath, config.packageManager);
  if (tarballPath) {
    Logger.success(`Created tarball at ${tarballPath}`);
  } else {
    Logger.error('Failed to create tarball.');
    process.exit(1);
  }

  // Update consuming app with the new tarball
  const packageJson = fs.readJsonSync(path.join(packagePath, 'package.json'));
  const legacyPeerDeps = config.legacyPeerDeps || false;
  const packManager = config.packageManager;
  updateConsumingApp(
    packageJson.name,
    tarballPath,
    packManager,
    legacyPeerDeps
  );

  Logger.info('Pack and update process completed successfully.');
}
