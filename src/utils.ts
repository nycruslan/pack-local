import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

export function removeOldTarballs(packagePath: string) {
  console.log(chalk.blue('Removing old tarballs...'));
  const tarballs = fs
    .readdirSync(packagePath)
    .filter((file) => file.endsWith('.tgz'));

  tarballs.forEach((file) => {
    fs.unlinkSync(path.join(packagePath, file));
    console.log(chalk.yellow(`Removed tarball: ${file}`));
  });
}

export function bumpPackVersion(packagePath: string) {
  const packageJsonPath = path.join(packagePath, 'package.json');
  const packageJson = fs.readJsonSync(packageJsonPath);
  const versionPattern = /^(\d+\.\d+\.\d+)(-pack\.(\d+))?$/;

  let [_, baseVersion, , packNumber] =
    packageJson.version?.match(versionPattern) || [];
  baseVersion = baseVersion || '1.0.0';
  packNumber = packNumber ? parseInt(packNumber) + 1 : 1;

  packageJson.version = `${baseVersion}-pack.${packNumber}`;
  fs.writeJsonSync(packageJsonPath, packageJson, { spaces: 2 });
  console.log(chalk.green(`Updated version to ${packageJson.version}`));
  return packageJson.version;
}

export function buildPackage(packagePath: string, packageManager: string) {
  console.log(chalk.blue(`Building package using ${packageManager}...`));
  try {
    execSync(`${packageManager} run build`, {
      cwd: packagePath,
      stdio: 'inherit',
    });
    console.log(chalk.green('Build completed successfully.'));
  } catch (error) {
    console.error(chalk.red('Build failed:'), error);
    process.exit(1);
  }
}

export function packPackage(packagePath: string, packageManager: string) {
  console.log(chalk.blue(`Packing package using ${packageManager}...`));
  try {
    const output = execSync(`${packageManager} pack`, {
      cwd: packagePath,
      stdio: 'pipe',
    }).toString();

    const tarballName = output.trim().split('\n').pop() || '';
    console.log(chalk.green(`Created tarball: ${tarballName}`));
    return path.join(packagePath, tarballName);
  } catch (error) {
    console.error(chalk.red('Packing failed:'), error);
    process.exit(1);
  }
}

export async function cleanup() {
  // Step 1: Load configuration to get the correct package path
  const configPath = path.resolve('pack-local.config.json');
  let packagePath = path.resolve('.'); // Default to current directory

  if (fs.existsSync(configPath)) {
    const config = fs.readJsonSync(configPath);
    packagePath = path.resolve(config.packagePath);
    fs.removeSync(configPath);
    console.log(chalk.green(`Removed configuration file: ${configPath}`));
  } else {
    console.log(chalk.yellow('No configuration file found to remove.'));
  }

  // Step 2: Remove "pack-local" script from consumer app's package.json
  const consumerPackageJsonPath = path.resolve('package.json');
  if (fs.existsSync(consumerPackageJsonPath)) {
    const consumerPackageJson = fs.readJsonSync(consumerPackageJsonPath);
    if (consumerPackageJson.scripts?.['pack-local']) {
      delete consumerPackageJson.scripts['pack-local'];
      fs.writeJsonSync(consumerPackageJsonPath, consumerPackageJson, {
        spaces: 2,
      });
      console.log(
        chalk.green('Removed "pack-local" script from consumer package.json.')
      );
    } else {
      console.log(
        chalk.yellow('"pack-local" script not found in consumer package.json.')
      );
    }
  }

  // Step 3: Remove .tgz tarball files in the specified package path
  if (fs.existsSync(packagePath)) {
    const tarballs = fs
      .readdirSync(packagePath)
      .filter((file) => file.endsWith('.tgz'));

    if (tarballs.length > 0) {
      tarballs.forEach((file) => {
        fs.unlinkSync(path.join(packagePath, file));
        console.log(chalk.yellow(`Removed tarball: ${file}`));
      });
    } else {
      console.log(
        chalk.yellow('No tarball files found to remove in package path.')
      );
    }
  } else {
    console.log(chalk.red(`Package path not found: ${packagePath}`));
  }

  // Step 4: Reset version in package.json of the packed library
  const packageJsonPath = path.join(packagePath, 'package.json');
  let resetVersion: string | undefined;
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = fs.readJsonSync(packageJsonPath);
    const versionPattern = /^(\d+\.\d+\.\d+)(-pack\.\d+)?$/;
    const match = packageJson.version?.match(versionPattern);

    if (match) {
      resetVersion = match[1]; // Reset to base version without "-pack" suffix
      packageJson.version = resetVersion;
      fs.writeJsonSync(packageJsonPath, packageJson, { spaces: 2 });
      console.log(
        chalk.green(
          `Reset version to ${packageJson.version} in package path package.json.`
        )
      );
    } else {
      console.log(
        chalk.yellow(
          'No "-pack" version suffix found to reset in package path.'
        )
      );
    }
  } else {
    console.log(
      chalk.red(`No package.json found in package path: ${packagePath}`)
    );
  }

  // Step 5: Update dependency in consumer app’s package.json to use reset version
  if (resetVersion && fs.existsSync(consumerPackageJsonPath)) {
    const consumerPackageJson = fs.readJsonSync(consumerPackageJsonPath);
    const libraryName = fs.readJsonSync(packageJsonPath).name;

    const updateDependency = (
      dependencies: Record<string, string> | undefined
    ) => {
      if (dependencies?.[libraryName]?.includes('.tgz')) {
        dependencies[libraryName] = resetVersion;
        console.log(
          chalk.green(
            `Updated ${libraryName} dependency to version ${resetVersion} in consumer package.json.`
          )
        );
      }
    };

    // Update both dependencies and devDependencies if applicable
    updateDependency(consumerPackageJson.dependencies);
    updateDependency(consumerPackageJson.devDependencies);

    fs.writeJsonSync(consumerPackageJsonPath, consumerPackageJson, {
      spaces: 2,
    });
  }

  console.log(chalk.blue('Cleanup completed.'));
}

export function updateConsumingApp(
  packageName: string,
  tarballPath: string,
  packageManager: string
) {
  console.log(chalk.blue("Updating consuming app's dependencies..."));

  const consumingPackageJsonPath = path.resolve('package.json');
  const consumingPackageJson = fs.readJsonSync(consumingPackageJsonPath);

  if (consumingPackageJson.dependencies?.[packageName]) {
    consumingPackageJson.dependencies[packageName] = `file:${tarballPath}`;
  } else if (consumingPackageJson.devDependencies?.[packageName]) {
    consumingPackageJson.devDependencies[packageName] = `file:${tarballPath}`;
  } else {
    console.error(
      chalk.red(
        `Package "${packageName}" not found in dependencies or devDependencies.`
      )
    );
    process.exit(1);
  }

  fs.writeJsonSync(consumingPackageJsonPath, consumingPackageJson, {
    spaces: 2,
  });
  console.log(chalk.green('Updated package.json with the new tarball path.'));

  try {
    console.log(
      chalk.blue(
        `Installing dependencies in the consuming app using ${packageManager}...`
      )
    );
    execSync(`${packageManager} install`, {
      cwd: process.cwd(),
      stdio: 'inherit',
    });
    console.log(chalk.green('Dependencies installed successfully.'));
  } catch (error) {
    console.error(chalk.red('Dependency installation failed:'), error);
    process.exit(1);
  }
}
