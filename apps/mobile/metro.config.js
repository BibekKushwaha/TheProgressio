const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the workspace root
const workspaceRoot = path.resolve(__dirname, '../..');
const projectRoot = __dirname;
const projectNodeModules = path.resolve(projectRoot, 'node_modules');
const workspaceNodeModules = path.resolve(workspaceRoot, 'node_modules');

const config = getDefaultConfig(projectRoot);

// 1. Watch monorepo root so Metro picks up changes in packages/*
config.watchFolders = [workspaceRoot];

// 2. Resolve packages — local first, then workspace root
config.resolver.nodeModulesPaths = [
  projectNodeModules,
  workspaceNodeModules,
];
// Avoid resolving dependencies by walking up from workspace package paths.
config.resolver.disableHierarchicalLookup = true;
// Force a single React instance for the mobile runtime.
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  react: path.resolve(projectNodeModules, 'react'),
  'react/jsx-runtime': path.resolve(projectNodeModules, 'react/jsx-runtime.js'),
  'react/jsx-dev-runtime': path.resolve(projectNodeModules, 'react/jsx-dev-runtime.js'),
};

// 3. Disable package.json "exports" field (fixes monorepo symlinks with RN)
config.resolver.unstable_enablePackageExports = false;

// 4. Map workspace packages that point to dist/ → src/ so Metro can resolve
//    without needing a pre-built dist. This is needed because dist/ contents
//    are gitignored and won't exist on EAS Build servers.
const WORKSPACE_SRC_MAP = {
  '@repo/store': path.resolve(workspaceRoot, 'packages/store/src/index.ts'),
  '@repo/schemas': path.resolve(workspaceRoot, 'packages/schemas/src/index.ts'),
};

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (WORKSPACE_SRC_MAP[moduleName]) {
    return {
      filePath: WORKSPACE_SRC_MAP[moduleName],
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
