import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import { Logger } from './logger.js';

export async function removeOldTarballs(packagePath: string) {
  Logger.info('Removing old tarballs...');
  try {
    const tarballs = fs
      .readdirSync(packagePath)
      .filter((file) => file.endsWith('.tgz'));

    if (tarballs.length === 0) {
      Logger.warn('No tarballs found to remove.');
      return;
    }

    tarballs.forEach((file) => {
      fs.unlinkSync(path.join(packagePath, file));
      Logger.warn(`Removed tarball: ${file}`);
    });
  } catch (error) {
    Logger.handleError(error, 'Failed to remove old tarballs');
  }
}

export function bumpPackVersion(packagePath: string): string {
  Logger.info('Bumping package version...');
  const packageJsonPath = path.join(packagePath, 'package.json');
  const versionPattern = /^(\d+\.\d+\.\d+)(-pack\.(\d+))?$/;
  let newVersion = '1.0.0-pack.1';

  try {
    const packageJson = fs.readJsonSync(packageJsonPath);
    const { version } = packageJson;
    const [, baseVersion, , packNumber] = version?.match(versionPattern) || [];
    newVersion = `${baseVersion || '1.0.0'}-pack.${
      packNumber ? +packNumber + 1 : 1
    }`;

    packageJson.version = newVersion;
    fs.writeJsonSync(packageJsonPath, packageJson, { spaces: 2 });
    Logger.success(`Updated version to ${newVersion}`);
  } catch (error) {
    Logger.handleError(error, 'Failed to bump package version');
  }

  return newVersion;
}

export function buildPackage(packagePath: string, packageManager: string) {
  Logger.info(`Building package using ${packageManager}...`);
  try {
    execSync(`${packageManager} run build`, {
      cwd: packagePath,
      stdio: 'inherit',
    });
    Logger.success('Build completed successfully.');
  } catch (error) {
    Logger.handleError(error, 'Build failed');
  }
}

export function packPackage(
  packagePath: string,
  packageManager: string
): string | undefined {
  Logger.info(`Packing package using ${packageManager}...`);
  try {
    const output = execSync(`${packageManager} pack`, {
      cwd: packagePath,
      stdio: 'pipe',
    }).toString();
    const tarballName = output.trim().split('\n').pop() || '';
    Logger.success(`Created tarball: ${tarballName}`);
    return path.join(packagePath, tarballName);
  } catch (error) {
    Logger.handleError(error, 'Packing failed');
    return undefined;
  }
}

export async function cleanup() {
  try {
    const configPath = path.resolve('pack-local.config.json');
    const consumerPackageJsonPath = path.resolve('package.json');

    const packagePath = fs.existsSync(configPath)
      ? (() => {
          const config = fs.readJsonSync(configPath);
          fs.removeSync(configPath);
          Logger.success(`Removed configuration file: ${configPath}`);
          return path.resolve(config.packagePath);
        })()
      : path.resolve('.');

    if (!fs.existsSync(configPath)) {
      Logger.warn('No configuration file found to remove.');
    }

    if (fs.existsSync(consumerPackageJsonPath)) {
      const packageJson = fs.readJsonSync(consumerPackageJsonPath);
      if (packageJson.scripts?.['pack-local']) {
        delete packageJson.scripts['pack-local'];
        fs.writeJsonSync(consumerPackageJsonPath, packageJson, { spaces: 2 });
        Logger.success(
          'Removed "pack-local" script from consumer package.json.'
        );
      } else {
        Logger.warn('"pack-local" script not found in consumer package.json.');
      }
    }

    if (fs.existsSync(packagePath)) {
      removeOldTarballs(packagePath);
    } else {
      Logger.error(`Package path not found: ${packagePath}`);
    }

    const resetVersionInPackageJson = () => {
      const packageJsonPath = path.join(packagePath, 'package.json');
      const packageJson = fs.readJsonSync(packageJsonPath);
      const baseVersion = packageJson.version?.replace(/-pack\.\d+$/, '');

      if (baseVersion) {
        packageJson.version = baseVersion;
        fs.writeJsonSync(packageJsonPath, packageJson, { spaces: 2 });
        Logger.success(
          `Reset version to ${baseVersion} in package path package.json.`
        );
      } else {
        Logger.warn(
          'No "-pack" version suffix found to reset in package path.'
        );
      }
      return baseVersion;
    };

    const resetVersion = fs.existsSync(path.join(packagePath, 'package.json'))
      ? resetVersionInPackageJson()
      : undefined;

    if (resetVersion && fs.existsSync(consumerPackageJsonPath)) {
      const consumerPackageJson = fs.readJsonSync(consumerPackageJsonPath);
      const libraryName = fs.readJsonSync(
        path.join(packagePath, 'package.json')
      ).name;

      const updateDependencies = (deps?: Record<string, string>) => {
        if (deps && deps[libraryName]?.includes('.tgz')) {
          deps[libraryName] = resetVersion;
          Logger.success(
            `Updated ${libraryName} dependency to version ${resetVersion}.`
          );
        }
      };

      updateDependencies(consumerPackageJson.dependencies);
      updateDependencies(consumerPackageJson.devDependencies);
      fs.writeJsonSync(consumerPackageJsonPath, consumerPackageJson, {
        spaces: 2,
      });
    }

    Logger.info('Cleanup completed.');
  } catch (error) {
    Logger.handleError(error, 'An error occurred during cleanup');
  }
}

export function updateConsumingApp(
  packageName: string,
  tarballPath: string,
  packageManager: string
) {
  Logger.info("Updating consuming app's dependencies...");
  const consumingPackageJsonPath = path.resolve('package.json');

  try {
    const consumingPackageJson = fs.readJsonSync(consumingPackageJsonPath);

    const updateDependencyPath = (deps?: Record<string, string>) => {
      if (deps?.[packageName]) {
        deps[packageName] = `file:${tarballPath}`;
        return true;
      }
      return false;
    };

    const updated =
      updateDependencyPath(consumingPackageJson.dependencies) ||
      updateDependencyPath(consumingPackageJson.devDependencies);

    if (!updated) {
      Logger.error(
        `Package "${packageName}" not found in dependencies or devDependencies.`
      );
      process.exit(1);
    }

    fs.writeJsonSync(consumingPackageJsonPath, consumingPackageJson, {
      spaces: 2,
    });
    Logger.success('Updated package.json with the new tarball path.');

    Logger.info(`Installing dependencies using ${packageManager}...`);
    execSync(`${packageManager} install`, { stdio: 'inherit' });
    Logger.success('Dependencies installed successfully.');
  } catch (error) {
    Logger.handleError(error, 'Failed to update consuming app');
  }
}
