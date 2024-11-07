## Pack-Local

`pack-local` is a CLI tool for locally packing and testing component libraries in projects. It automates the process of versioning, building, packing, and linking a component library to a consuming app.

### Installation

```bash
npm install -g pack-local
```

### Commands

- **`pack-local init`**: Initializes configuration for local packing and adds a script to `package.json`.
- **`pack-local run`**: Executes the entire packing process, updating the consuming app’s dependencies to use the latest local tarball.

### Usage

1. **Initialize the Configuration**:

   Run this command in the root directory of your component library to generate a `pack-local.config.json` file with default settings.

   ```bash
   pack-local init
   ```

   This creates a config file and adds a `"pack-local"` script to `package.json` for easy execution.

2. **Run the Local Pack Process**:

   Execute the main command to package and update the consuming app. Make sure to run this command after `init`.

   ```bash
   pack-local run
   ```

   This command:

   - Removes old tarballs.
   - Increments the version with a `-pack` suffix.
   - Builds the library.
   - Creates a new tarball.
   - Updates the consuming app’s `package.json` to use the new tarball.

### Configuration

`pack-local.config.json`:

- **`packagePath`**: Path to the component library (default: `"./"`).
- **`packageManager`**: Package manager to use (`npm`, `yarn`, or `pnpm`).

### Example

After setting up, simply run:

```bash
npm run pack-local
```

This will update your consuming app to use the latest version of your component library locally.

### License

ISC License
