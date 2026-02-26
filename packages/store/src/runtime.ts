type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};



type PlatformLike = {
  OS?: string;
};

type NativeModulesLike = {
  SourceCode?: {
    scriptURL?: string;
  };
};

type ExpoConstantsLike = {
  expoConfig?: {
    hostUri?: string;
  };
  manifest2?: {
    extra?: {
      expoClient?: {
        hostUri?: string;
      };
    };
  };
  manifest?: {
    debuggerHost?: string;
  };
};

type RequireLike = (id: string) => unknown;
const REACT_NATIVE_MODULE_ID = ['react', 'native'].join('-');
const EXPO_CONSTANTS_MODULE_ID = ['expo', 'constants'].join('-');

function getNavigatorUserAgent(): string {
  const maybeNavigator = (globalThis as { navigator?: unknown }).navigator as
    | { userAgent?: unknown }
    | undefined;
  const userAgent = maybeNavigator?.userAgent;
  return typeof userAgent === 'string' ? userAgent.toLowerCase() : '';
}

function getStorage(): StorageLike | null {
  const storage = (globalThis as { localStorage?: unknown }).localStorage as StorageLike | undefined;
  if (
    storage &&
    typeof storage.getItem === 'function' &&
    typeof storage.setItem === 'function' &&
    typeof storage.removeItem === 'function'
  ) {
    return storage;
  }
  return null;
}

export function getLocalStorageItem(key: string): string | null {
  return getStorage()?.getItem(key) ?? null;
}

export function setLocalStorageItem(key: string, value: string): void {
  getStorage()?.setItem(key, value);
}

export function removeLocalStorageItem(key: string): void {
  getStorage()?.removeItem(key);
}

export function getFamilyShareToken(): string | null {
  return getLocalStorageItem('family_share_token');
}

const AI_DISABLED_KEY = 'ai_disabled';

export function isAIAssistanceDisabled(): boolean {
  return getLocalStorageItem(AI_DISABLED_KEY) === '1';
}

export function setAIAssistanceDisabled(disabled: boolean): void {
  if (disabled) {
    setLocalStorageItem(AI_DISABLED_KEY, '1');
  } else {
    removeLocalStorageItem(AI_DISABLED_KEY);
  }
}

export function supportsWindowNetworkEvents(): boolean {
  const maybeWindow = (globalThis as { window?: unknown }).window as
    | { addEventListener?: unknown; removeEventListener?: unknown }
    | undefined;

  return Boolean(
    maybeWindow &&
    typeof maybeWindow.addEventListener === 'function' &&
    typeof maybeWindow.removeEventListener === 'function'
  );
}

export function isOnline(): boolean {
  const maybeNavigator = (globalThis as { navigator?: unknown }).navigator as
    | { onLine?: unknown }
    | undefined;

  if (maybeNavigator && typeof maybeNavigator.onLine === 'boolean') {
    return maybeNavigator.onLine;
  }
  return true;
}

export function supportsIndexedDb(): boolean {
  const maybeIndexedDb = (globalThis as { indexedDB?: unknown }).indexedDB;
  return typeof maybeIndexedDb === 'object' && maybeIndexedDb !== null;
}

function getGlobalRequire(): RequireLike | null {
  const maybeRequire = (globalThis as { require?: unknown }).require;
  return typeof maybeRequire === 'function' ? (maybeRequire as RequireLike) : null;
}

/**
 * Returns a reference to `require` that is intentionally opaque to static
 * bundler analysis (webpack / Turbopack). Both bundlers trace `require()`
 * calls at compile time and emit "Module not found" warnings for any string
 * that cannot be resolved — even when the call is inside a try/catch.
 *
 * Using `new Function(...)` to obtain `require` at runtime means the
 * bundler never sees a traceable `require(...)` call and skips the warning.
 * At runtime in a real CommonJS/Node context the function works normally;
 * in a browser bundle `require` is either undefined or the bundler shim,
 * and we catch / ignore errors just as before.
 */
function getModuleRequire(): RequireLike | null {
  try {
    const r = new Function('return typeof require==="function"?require:null')() as RequireLike | null;
    return r;
  } catch {
    return getGlobalRequire();
  }
}

function getExpoOs(): string | null {
  const maybeProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  const os = maybeProcess?.env?.EXPO_OS;
  return typeof os === 'string' && os.length > 0 ? os : null;
}

function isReactNativeRuntime(): boolean {
  if (getExpoOs()) {
    return true;
  }

  const maybeGlobal = globalThis as {
    nativeCallSyncHook?: unknown;
    __turboModuleProxy?: unknown;
    HermesInternal?: unknown;
  };
  if (
    typeof maybeGlobal.nativeCallSyncHook === 'function' ||
    typeof maybeGlobal.__turboModuleProxy === 'function' ||
    (typeof maybeGlobal.HermesInternal === 'object' && maybeGlobal.HermesInternal !== null)
  ) {
    return true;
  }

  const localRequire = getModuleRequire();
  if (localRequire) {
    try {
      const reactNativeModule = localRequire(REACT_NATIVE_MODULE_ID) as { Platform?: PlatformLike };
      if (typeof reactNativeModule?.Platform?.OS === 'string') {
        return true;
      }
    } catch {
      /* ignore */
    }
  }

  const navigatorValue = (globalThis as { navigator?: unknown }).navigator as
    | { product?: unknown }
    | undefined;

  return navigatorValue?.product === 'ReactNative';
}

function getReactNativePlatformOs(): string | null {
  const expoOs = getExpoOs();
  if (expoOs) {
    return expoOs;
  }

  const localRequire = getModuleRequire();
  if (!localRequire) {
    return null;
  }

  try {
    const reactNativeModule = localRequire(REACT_NATIVE_MODULE_ID) as { Platform?: PlatformLike };
    const os = reactNativeModule?.Platform?.OS;
    return typeof os === 'string' ? os : null;
  } catch {
    const userAgent = getNavigatorUserAgent();
    if (userAgent.includes('android')) {
      return 'android';
    }
    if (userAgent.includes('iphone') || userAgent.includes('ipad') || userAgent.includes('ios')) {
      return 'ios';
    }
    return null;
  }
}

function getReactNativeDevHost(): string | null {
  const localRequire = getModuleRequire();
  if (!localRequire) {
    return null;
  }

  try {
    const reactNativeModule = localRequire(REACT_NATIVE_MODULE_ID) as { NativeModules?: NativeModulesLike };
    const scriptUrl = reactNativeModule?.NativeModules?.SourceCode?.scriptURL;
    if (typeof scriptUrl === 'string') {
      const hostname = new URL(scriptUrl).hostname;
      if (hostname) {
        return hostname;
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const expoConstantsModule = localRequire(EXPO_CONSTANTS_MODULE_ID) as { default?: ExpoConstantsLike };
    const constants = expoConstantsModule?.default;
    const hostUri =
      constants?.expoConfig?.hostUri ??
      constants?.manifest2?.extra?.expoClient?.hostUri ??
      constants?.manifest?.debuggerHost;

    if (typeof hostUri === 'string' && hostUri.length > 0) {
      const [host] = hostUri.split(':');
      return host || null;
    }
  } catch {
    /* ignore */
  }

  return null;
}

function trimTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function replaceUrlHost(url: string, host: string): string {
  const parsed = new URL(url);
  parsed.hostname = host;
  return trimTrailingSlash(parsed.toString());
}

export function resolveServiceUrl(envValue: string | undefined, fallbackUrl: string): string {
  const baseUrl = trimTrailingSlash(envValue || fallbackUrl);

  if (!isReactNativeRuntime()) {
    return baseUrl;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    return baseUrl;
  }

  const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0']);
  if (!localHosts.has(parsedUrl.hostname)) {
    return baseUrl;
  }

  if (getReactNativePlatformOs() === 'android') {
    return replaceUrlHost(baseUrl, '10.0.2.2');
  }

  const devHost = getReactNativeDevHost();
  if (devHost && !localHosts.has(devHost)) {
    return replaceUrlHost(baseUrl, devHost);
  }

  return baseUrl;
}

export function isNativeRuntime(): boolean {
  return isReactNativeRuntime();
}
