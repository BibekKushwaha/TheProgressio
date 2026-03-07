import { describe, expect, it } from 'vitest';

import {
  isAdminPath,
  isProtectedPath,
  isPublicPath,
  mergeCookieHeader,
  splitSetCookieHeader,
} from '@/lib/server-auth';

describe('server auth path classification', () => {
  it('marks dashboard routes as protected', () => {
    expect(isProtectedPath('/dashboard')).toBe(true);
    expect(isProtectedPath('/dashboard/overview')).toBe(true);
  });

  it('keeps auth and invite-accept routes public', () => {
    expect(isPublicPath('/login')).toBe(true);
    expect(isPublicPath('/family-connect/accept/token-123')).toBe(true);
    expect(isProtectedPath('/family-connect/accept/token-123')).toBe(false);
  });

  it('marks admin routes as protected admin-only paths', () => {
    expect(isProtectedPath('/admin')).toBe(true);
    expect(isAdminPath('/admin')).toBe(true);
    expect(isAdminPath('/admin/revenue')).toBe(true);
    expect(isAdminPath('/dashboard')).toBe(false);
  });
});

describe('server auth cookie helpers', () => {
  it('splits a combined set-cookie header without breaking expires values', () => {
    const header = 'token=abc; Path=/; HttpOnly, refreshToken=xyz; Expires=Wed, 12 Mar 2026 10:00:00 GMT; Path=/; HttpOnly';

    expect(splitSetCookieHeader(header)).toEqual([
      'token=abc; Path=/; HttpOnly',
      'refreshToken=xyz; Expires=Wed, 12 Mar 2026 10:00:00 GMT; Path=/; HttpOnly',
    ]);
  });

  it('merges refreshed cookies back into the outgoing cookie header', () => {
    const merged = mergeCookieHeader('token=old; refreshToken=old-refresh; theme=dark', [
      'token=new-token; Path=/; HttpOnly',
      'refreshToken=new-refresh; Path=/; HttpOnly',
    ]);

    expect(merged).toContain('token=new-token');
    expect(merged).toContain('refreshToken=new-refresh');
    expect(merged).toContain('theme=dark');
  });
});