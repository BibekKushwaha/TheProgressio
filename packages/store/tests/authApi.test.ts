/**
 * Unit tests for RTK Query API definitions — authApi
 */
import { describe, it, expect } from 'vitest'
import { authApi } from '../src/services/authApi'

describe('authApi — Endpoint Configuration', () => {
  const endpoints = authApi.endpoints

  it('has register mutation', () => {
    expect(endpoints).toHaveProperty('register')
  })

  it('has login mutation', () => {
    expect(endpoints).toHaveProperty('login')
  })

  it('has logout mutation', () => {
    expect(endpoints).toHaveProperty('logout')
  })

  it('has getProfile query', () => {
    expect(endpoints).toHaveProperty('getProfile')
  })

  it('has updateProfile mutation', () => {
    expect(endpoints).toHaveProperty('updateProfile')
  })

  it('has forgotPassword mutation', () => {
    expect(endpoints).toHaveProperty('forgotPassword')
  })

  it('has resetPassword mutation', () => {
    expect(endpoints).toHaveProperty('resetPassword')
  })

  // ── Mobile Auth ──────────────────────────────────────────────────────

  it('has mobileLogin mutation', () => {
    expect(endpoints).toHaveProperty('mobileLogin')
  })

  it('has mobileRefresh mutation', () => {
    expect(endpoints).toHaveProperty('mobileRefresh')
  })

  it('has mobileLogout mutation', () => {
    expect(endpoints).toHaveProperty('mobileLogout')
  })

  it('has mobileMe query', () => {
    expect(endpoints).toHaveProperty('mobileMe')
  })

  // ── Family Share ─────────────────────────────────────────────────────

  it('has createFamilyLink mutation', () => {
    expect(endpoints).toHaveProperty('createFamilyLink')
  })

  it('has getFamilyLinks query', () => {
    expect(endpoints).toHaveProperty('getFamilyLinks')
  })

  it('has revokeFamilyLink mutation', () => {
    expect(endpoints).toHaveProperty('revokeFamilyLink')
  })

  it('has resolveFamilyLink query', () => {
    expect(endpoints).toHaveProperty('resolveFamilyLink')
  })
})

describe('authApi — Reducer & Metadata', () => {
  it('has reducerPath "authApi"', () => {
    expect(authApi.reducerPath).toBe('authApi')
  })

  it('exports the reducer', () => {
    expect(authApi.reducer).toBeDefined()
    expect(typeof authApi.reducer).toBe('function')
  })

  it('exports middleware', () => {
    expect(authApi.middleware).toBeDefined()
    expect(typeof authApi.middleware).toBe('function')
  })
})
