/**
 * Unit tests for RTK Query API definitions — categoriesApi
 */
import { describe, it, expect } from 'vitest'
import { categoriesApi } from '../src/services/categoriesApi'

describe('categoriesApi — Endpoint Configuration', () => {
  const endpoints = categoriesApi.endpoints

  it('has getCategories query', () => {
    expect(endpoints).toHaveProperty('getCategories')
  })

  it('has getCategoryById query', () => {
    expect(endpoints).toHaveProperty('getCategoryById')
  })

  it('has createCategory mutation', () => {
    expect(endpoints).toHaveProperty('createCategory')
  })

  it('has updateCategory mutation', () => {
    expect(endpoints).toHaveProperty('updateCategory')
  })

  it('has deleteCategory mutation', () => {
    expect(endpoints).toHaveProperty('deleteCategory')
  })
})

describe('categoriesApi — Reducer & Metadata', () => {
  it('has reducerPath "categoriesApi"', () => {
    expect(categoriesApi.reducerPath).toBe('categoriesApi')
  })

  it('exports the reducer', () => {
    expect(categoriesApi.reducer).toBeDefined()
    expect(typeof categoriesApi.reducer).toBe('function')
  })

  it('exports middleware', () => {
    expect(categoriesApi.middleware).toBeDefined()
    expect(typeof categoriesApi.middleware).toBe('function')
  })
})
