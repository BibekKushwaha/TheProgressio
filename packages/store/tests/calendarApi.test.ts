/**
 * Unit tests for RTK Query API definitions — calendarApi
 */
import { describe, it, expect } from 'vitest'
import { calendarApi } from '../src/services/calendarApi'

describe('calendarApi — Endpoint Configuration', () => {
  const endpoints = calendarApi.endpoints

  it('has getMonthlyEvents query', () => {
    expect(endpoints).toHaveProperty('getMonthlyEvents')
  })

  it('has getCalendarDailySchedule query', () => {
    expect(endpoints).toHaveProperty('getCalendarDailySchedule')
  })
})

describe('calendarApi — Reducer & Metadata', () => {
  it('has reducerPath "calendarApi"', () => {
    expect(calendarApi.reducerPath).toBe('calendarApi')
  })

  it('exports the reducer', () => {
    expect(calendarApi.reducer).toBeDefined()
    expect(typeof calendarApi.reducer).toBe('function')
  })

  it('exports middleware', () => {
    expect(calendarApi.middleware).toBeDefined()
    expect(typeof calendarApi.middleware).toBe('function')
  })
})
