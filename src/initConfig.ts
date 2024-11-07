import fs from 'fs-extra';
import path from 'path';

export async function initConfig() {
  const configPath = path.resolve('pack-local.config.json');
  const defaultConfig = {
    packagePath: './',
    packageManager: 'npm',
  };

  if (fs.existsSync(configPath)) {
    console.log('Configuration file already exists.');
    return;
  }

  fs.writeJsonSync(configPath, defaultConfig, { spaces: 2 });
  console.log(`Created configuration file at ${configPath}`);

  // Add script to package.json
  const packageJsonPath = path.resolve('package.json');
  const packageJson = fs.readJsonSync(packageJsonPath);
  packageJson.scripts = {
    ...packageJson.scripts,
    'pack-local': 'pack-local run',
  };
  fs.writeJsonSync(packageJsonPath, packageJson, { spaces: 2 });
  console.log('Added "pack-local" script to package.json.');
}
