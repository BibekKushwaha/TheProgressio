import { isNativeRuntime } from './runtime';

type Tokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt?: string;
};

const ACCESS_KEY = 'auth:accessToken';
const REFRESH_KEY = 'auth:refreshToken';
const EXPIRES_KEY = 'auth:expiresAt';

let cachedAccessToken: string | null = null;
let cachedRefreshToken: string | null = null;
let cachedExpiresAt: string | null = null;

type AsyncStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  multiSet?(pairs: Array<[string, string]>): Promise<void>;
  multiRemove?(keys: string[]): Promise<void>;
};

function getAsyncStorage(): AsyncStorageLike | null {
  if (!isNativeRuntime()) return null;
  try {
    const req = (globalThis as any).require as ((id: string) => any) | undefined;
    const mod = req ? req('@react-native-async-storage/async-storage') : null;
    const storage = mod?.default ?? mod;
    if (storage && typeof storage.getItem === 'function') {
      return storage as AsyncStorageLike;
    }
    return null;
  } catch {
    return null;
  }
}

export function getAccessTokenSync(): string | null {
  return cachedAccessToken;
}

export function getRefreshTokenSync(): string | null {
  return cachedRefreshToken;
}

export async function hydrateFromStorage(): Promise<void> {
  const storage = getAsyncStorage();
  if (!storage) return;

  const [accessToken, refreshToken, expiresAt] = await Promise.all([
    storage.getItem(ACCESS_KEY),
    storage.getItem(REFRESH_KEY),
    storage.getItem(EXPIRES_KEY),
  ]);

  cachedAccessToken = accessToken;
  cachedRefreshToken = refreshToken;
  cachedExpiresAt = expiresAt;
}

export async function setTokens(tokens: Tokens): Promise<void> {
  cachedAccessToken = tokens.accessToken;
  cachedRefreshToken = tokens.refreshToken;
  cachedExpiresAt = tokens.expiresAt ?? null;

  const storage = getAsyncStorage();
  if (!storage) return;

  if (typeof storage.multiSet === 'function') {
    const pairs: Array<[string, string]> = [
      [ACCESS_KEY, tokens.accessToken],
      [REFRESH_KEY, tokens.refreshToken],
    ];
    if (tokens.expiresAt) pairs.push([EXPIRES_KEY, tokens.expiresAt]);
    await storage.multiSet(pairs);
    return;
  }

  await storage.setItem(ACCESS_KEY, tokens.accessToken);
  await storage.setItem(REFRESH_KEY, tokens.refreshToken);
  if (tokens.expiresAt) {
    await storage.setItem(EXPIRES_KEY, tokens.expiresAt);
  } else {
    await storage.removeItem(EXPIRES_KEY);
  }
}

export async function clearTokens(): Promise<void> {
  cachedAccessToken = null;
  cachedRefreshToken = null;
  cachedExpiresAt = null;

  const storage = getAsyncStorage();
  if (!storage) return;

  if (typeof storage.multiRemove === 'function') {
    await storage.multiRemove([ACCESS_KEY, REFRESH_KEY, EXPIRES_KEY]);
    return;
  }

  await Promise.all([
    storage.removeItem(ACCESS_KEY),
    storage.removeItem(REFRESH_KEY),
    storage.removeItem(EXPIRES_KEY),
  ]);
}

export function getExpiresAtSync(): string | null {
  return cachedExpiresAt;
}

