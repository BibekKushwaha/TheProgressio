/**
 * Unit tests for RTK Query API definitions — timetableApi
 */
import { describe, it, expect } from 'vitest'
import { timetableApi } from '../src/services/timetableApi'

describe('timetableApi — Endpoint Configuration', () => {
  const endpoints = timetableApi.endpoints

  it('has getDailySchedule query', () => {
    expect(endpoints).toHaveProperty('getDailySchedule')
  })

  it('has getHolidays query', () => {
    expect(endpoints).toHaveProperty('getHolidays')
  })

  it('has createHoliday mutation', () => {
    expect(endpoints).toHaveProperty('createHoliday')
  })

  it('has updateHoliday mutation', () => {
    expect(endpoints).toHaveProperty('updateHoliday')
  })

  it('has deleteHoliday mutation', () => {
    expect(endpoints).toHaveProperty('deleteHoliday')
  })
})

describe('timetableApi — Reducer & Metadata', () => {
  it('has reducerPath "timetableApi"', () => {
    expect(timetableApi.reducerPath).toBe('timetableApi')
  })

  it('exports the reducer', () => {
    expect(timetableApi.reducer).toBeDefined()
    expect(typeof timetableApi.reducer).toBe('function')
  })

  it('exports middleware', () => {
    expect(timetableApi.middleware).toBeDefined()
    expect(typeof timetableApi.middleware).toBe('function')
  })
})
