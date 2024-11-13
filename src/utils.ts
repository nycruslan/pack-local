import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import { Logger } from './logger.js';

// Removes old tarballs in the specified package directory.
export async function removeOldTarballs(packagePath: string): Promise<void> {
  Logger.info('Checking for old tarballs to remove...');
  try {
    const tarballs = fs
      .readdirSync(packagePath)
      .filter((file) => file.endsWith('.tgz'));
    if (!tarballs.length) {
      Logger.info('No old tarballs found.');
      return;
    }

    tarballs.forEach((file) => {
      fs.unlinkSync(path.join(packagePath, file));
      Logger.success(`Removed old tarball: ${file}`);
    });
  } catch (error) {
    Logger.handleError(error, 'Failed to remove old tarballs');
  }
}

// Bumps the package version by updating it to the next 'pack' version.
export function bumpPackVersion(packagePath: string): string {
  Logger.info('Bumping package version...');
  const packageJsonPath = path.join(packagePath, 'package.json');
  const versionPattern = /^(\d+\.\d+\.\d+)(-pack\.(\d+))?$/;
  let newVersion = '1.0.0-pack.1';

  try {
    const packageJson = fs.readJsonSync(packageJsonPath);
    const [, baseVersion = '1.0.0', , packNumber] =
      (packageJson.version || '').match(versionPattern) || [];
    newVersion = `${baseVersion}-pack.${packNumber ? +packNumber + 1 : 1}`;
    packageJson.version = newVersion;

    fs.writeJsonSync(packageJsonPath, packageJson, { spaces: 2 });
  } catch (error) {
    Logger.handleError(error, 'Failed to bump package version');
  }

  return newVersion;
}

// Builds the package using the specified package manager.
export function buildPackage(
  packagePath: string,
  packageManager: string
): void {
  Logger.info(`Starting package build using ${packageManager}...`);
  try {
    execSync(`${packageManager} run build`, {
      cwd: packagePath,
      stdio: 'inherit',
    });
    Logger.success('Package build completed successfully.');
  } catch (error) {
    Logger.handleError(error, 'Package build failed');
  }
}

// Packs the package and returns the tarball path.
export function packPackage(
  packagePath: string,
  packageManager: string
): string | undefined {
  Logger.info(`Creating package tarball using ${packageManager}...`);
  try {
    const output = execSync(`${packageManager} pack`, {
      cwd: packagePath,
      stdio: 'pipe',
    })
      .toString()
      .trim();
    const tarballName = output.split('\n').pop() as string;
    const tarballPath = path.join(packagePath, tarballName);

    Logger.success(`Created tarball: ${tarballName} at ${tarballPath}`);
    return tarballPath;
  } catch (error) {
    Logger.handleError(error, 'Packing failed');
  }
}

// Cleans up configuration and package artifacts.
export async function cleanup(): Promise<void> {
  Logger.info('Starting cleanup process...');
  const configPath = path.resolve('pack-local.config.json');
  const consumerPackageJsonPath = path.resolve('package.json');

  try {
    const packagePath = await resolvePackagePath(configPath);
    await cleanupConsumerPackageJson(consumerPackageJsonPath);
    await removeOldTarballs(packagePath);
    resetVersionInPackageJson(packagePath, consumerPackageJsonPath);
    Logger.success('Cleanup process completed successfully.');
  } catch (error) {
    Logger.handleError(error, 'An error occurred during cleanup');
  }
}

// Updates the dependency path in the consuming app's package.json.
export function updateConsumingApp(
  packageName: string,
  tarballPath: string,
  packageManager: string,
  legacyPeerDeps: boolean = false
): void {
  Logger.info(`Updating dependency path for ${packageName} to tarball path...`);
  const consumingPackageJsonPath = path.resolve('package.json');

  try {
    const consumingPackageJson = fs.readJsonSync(consumingPackageJsonPath);

    if (!updateDependencyPath(consumingPackageJson, packageName, tarballPath)) {
      Logger.error(
        `Package "${packageName}" not found in dependencies or devDependencies.`
      );
      process.exit(1);
    }

    fs.writeJsonSync(consumingPackageJsonPath, consumingPackageJson, {
      spaces: 2,
    });
    Logger.success(
      `Updated ${packageName} dependency path to ${tarballPath} in package.json`
    );

    const installCommand = `${packageManager} install${
      legacyPeerDeps ? ' --legacy-peer-deps' : ''
    }`;
    execSync(installCommand, { stdio: 'inherit' });
    Logger.success('Dependency installation completed successfully.');
  } catch (error) {
    Logger.handleError(error, 'Failed to update consuming app');
  }
}

// --- Helper Functions ---

// Resolves the package path from the configuration file if it exists.
async function resolvePackagePath(configPath: string): Promise<string> {
  if (fs.existsSync(configPath)) {
    const config = await fs.readJson(configPath);
    fs.removeSync(configPath);
    Logger.success(`Removed configuration file: ${configPath}`);
    return path.resolve(config.packagePath);
  }
  Logger.info('Configuration file not found; defaulting to current directory.');
  return path.resolve('.');
}

// Resets the version in the package.json of the specified package path.
function resetVersionInPackageJson(
  packagePath: string,
  consumerPackageJsonPath: string
): void {
  const packageJsonPath = path.join(packagePath, 'package.json');
  try {
    const packageJson = fs.readJsonSync(packageJsonPath);
    const baseVersion = packageJson.version.replace(/-pack\.\d+$/, '');

    if (baseVersion) {
      packageJson.version = baseVersion;
      fs.writeJsonSync(packageJsonPath, packageJson, { spaces: 2 });
      updateDependencyVersionsInConsumer(
        packagePath,
        consumerPackageJsonPath,
        baseVersion
      );
    } else {
      Logger.info('No "-pack" suffix in version to reset.');
    }
  } catch (error) {
    Logger.handleError(error, 'Failed to reset version in package.json');
  }
}

// Cleans up the "pack-local" script from the consumer package.json.
async function cleanupConsumerPackageJson(
  consumerPackageJsonPath: string
): Promise<void> {
  if (fs.existsSync(consumerPackageJsonPath)) {
    const packageJson = await fs.readJson(consumerPackageJsonPath);
    if (packageJson.scripts?.['pack-local']) {
      delete packageJson.scripts['pack-local'];
      await fs.writeJson(consumerPackageJsonPath, packageJson, { spaces: 2 });
      Logger.success('Removed "pack-local" script from consumer package.json');
    } else {
      Logger.info('"pack-local" script not found in consumer package.json.');
    }
  }
}

// Updates dependencies to match the reset version in the consumer package.json.
function updateDependencyVersionsInConsumer(
  packagePath: string,
  consumerPackageJsonPath: string,
  resetVersion: string
): void {
  if (!resetVersion || !fs.existsSync(consumerPackageJsonPath)) return;

  const consumerPackageJson = fs.readJsonSync(consumerPackageJsonPath);
  const libraryName = fs.readJsonSync(
    path.join(packagePath, 'package.json')
  ).name;

  const updateDependencies = (deps?: Record<string, string>) => {
    if (deps?.[libraryName]?.includes('.tgz')) {
      deps[libraryName] = resetVersion;
      Logger.success(
        `Updated ${libraryName} dependency to version ${resetVersion}.`
      );
    }
  };

  updateDependencies(consumerPackageJson.dependencies);
  updateDependencies(consumerPackageJson.devDependencies);
  fs.writeJsonSync(consumerPackageJsonPath, consumerPackageJson, { spaces: 2 });
}

// Updates the dependency path in the specified package.json object.
function updateDependencyPath(
  packageJson: Record<string, any>,
  packageName: string,
  tarballPath: string
): boolean {
  const updatePath = (deps?: Record<string, string>): boolean => {
    if (deps?.[packageName]) {
      deps[packageName] = `file:${tarballPath}`;
      return true;
    }
    return false;
  };
  return (
    updatePath(packageJson.dependencies) ||
    updatePath(packageJson.devDependencies)
  );
}
