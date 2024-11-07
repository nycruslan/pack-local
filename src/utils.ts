import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

export function removeOldTarballs(packagePath: string) {
  console.log('Removing old tarballs...');
  const tarballs = fs
    .readdirSync(packagePath)
    .filter((file) => file.endsWith('.tgz'));

  tarballs.forEach((file) => {
    fs.unlinkSync(path.join(packagePath, file));
    console.log(`Removed tarball: ${file}`);
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
  console.log(`Updated version to ${packageJson.version}`);
  return packageJson.version;
}

export function buildPackage(packagePath: string, packageManager: string) {
  console.log(`Building package using ${packageManager}...`);
  try {
    execSync(`${packageManager} run build`, {
      cwd: packagePath,
      stdio: 'inherit',
    });
    console.log('Build completed successfully.');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

export function packPackage(packagePath: string, packageManager: string) {
  console.log(`Packing package using ${packageManager}...`);
  try {
    const output = execSync(`${packageManager} pack`, {
      cwd: packagePath,
      stdio: 'pipe',
    }).toString();

    const tarballName = output.trim().split('\n').pop() || '';
    console.log(`Created tarball: ${tarballName}`);
    return path.join(packagePath, tarballName);
  } catch (error) {
    console.error('Packing failed:', error);
    process.exit(1);
  }
}

export function updateConsumingApp(
  packageName: string,
  tarballPath: string,
  packageManager: string
) {
  console.log("Updating consuming app's dependencies...");

  const consumingPackageJsonPath = path.resolve('package.json');
  const consumingPackageJson = fs.readJsonSync(consumingPackageJsonPath);

  if (consumingPackageJson.dependencies?.[packageName]) {
    consumingPackageJson.dependencies[packageName] = `file:${tarballPath}`;
  } else if (consumingPackageJson.devDependencies?.[packageName]) {
    consumingPackageJson.devDependencies[packageName] = `file:${tarballPath}`;
  } else {
    console.error(
      `Package "${packageName}" not found in dependencies or devDependencies.`
    );
    process.exit(1);
  }

  fs.writeJsonSync(consumingPackageJsonPath, consumingPackageJson, {
    spaces: 2,
  });
  console.log('Updated package.json with the new tarball path.');

  try {
    console.log(
      `Installing dependencies in the consuming app using ${packageManager}...`
    );
    execSync(`${packageManager} install`, {
      cwd: process.cwd(),
      stdio: 'inherit',
    });
    console.log('Dependencies installed successfully.');
  } catch (error) {
    console.error('Dependency installation failed:', error);
    process.exit(1);
  }
}
