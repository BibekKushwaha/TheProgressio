import '@testing-library/jest-dom';
import React from 'react';
import reactDomPackage from 'react-dom/package.json';

// In this monorepo, hoisted deps can resolve a different react-dom patch at test time.
// Align the version string used by react-dom's guard so JSDOM tests can execute.
if (React.version !== reactDomPackage.version) {
  React.version = reactDomPackage.version;
}
