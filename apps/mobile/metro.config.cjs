const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the workspace root
const workspaceRoot = path.resolve(__dirname, '../..');
const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

// 1. Watch monorepo root AND all expo defaults
config.watchFolders = [workspaceRoot];

// 2. Let Metro know where to resolve packages (local first, then workspace root)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Disable package.json "exports" field resolution (fixes monorepo symlinks)
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
