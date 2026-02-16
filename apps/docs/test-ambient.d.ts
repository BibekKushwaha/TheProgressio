// Lightweight ambient types to satisfy typechecking for test files when test deps
// are not installed in this environment. These are minimal and only for build
// time; prefer installing proper devDependencies for full typings.

declare module '@testing-library/react' {
  export function render(...args: unknown[]): unknown;
  export const screen: {
    queryByText: (...args: unknown[]) => unknown;
    getByText: (...args: unknown[]) => unknown;
  };
  export const fireEvent: {
    click: (...args: unknown[]) => unknown;
  };
}

declare module '@testing-library/jest-dom' {
  // jest-dom augments expect; we provide a minimal placeholder
  const _default: unknown;
  export default _default;
}

declare function describe(name: string, fn: () => void): void;
declare function it(name: string, fn: () => void): void;
declare function expect(value: unknown): {
  toBeNull: () => void;
  toBeTruthy: () => void;
};
declare const vi: {
  fn: (...args: unknown[]) => unknown;
  mock: (...args: unknown[]) => unknown;
};

