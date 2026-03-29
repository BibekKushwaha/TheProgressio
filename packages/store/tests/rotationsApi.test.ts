/**
 * Unit tests for RTK Query API definitions — rotationsApi
 */
import { describe, it, expect } from 'vitest'
import { rotationsApi } from '../src/services/rotationsApi'

describe('rotationsApi — Endpoint Configuration', () => {
  const endpoints = rotationsApi.endpoints

  it('has getRotationPatterns query', () => {
    expect(endpoints).toHaveProperty('getRotationPatterns')
  })

  it('has getRotationPatternById query', () => {
    expect(endpoints).toHaveProperty('getRotationPatternById')
  })

  it('has createRotationPattern mutation', () => {
    expect(endpoints).toHaveProperty('createRotationPattern')
  })

  it('has updateRotationPattern mutation', () => {
    expect(endpoints).toHaveProperty('updateRotationPattern')
  })

  it('has deleteRotationPattern mutation', () => {
    expect(endpoints).toHaveProperty('deleteRotationPattern')
  })
})

describe('rotationsApi — Reducer & Metadata', () => {
  it('has reducerPath "rotationsApi"', () => {
    expect(rotationsApi.reducerPath).toBe('rotationsApi')
  })

  it('exports the reducer', () => {
    expect(rotationsApi.reducer).toBeDefined()
    expect(typeof rotationsApi.reducer).toBe('function')
  })

  it('exports middleware', () => {
    expect(rotationsApi.middleware).toBeDefined()
    expect(typeof rotationsApi.middleware).toBe('function')
  })
})
