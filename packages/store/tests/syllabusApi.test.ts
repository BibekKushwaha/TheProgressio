import { describe, it, expect } from 'vitest'
import { syllabusApi } from '../src/services/syllabusApi'

describe('syllabusApi — Endpoint Configuration', () => {
  const endpoints = syllabusApi.endpoints

  it('has getSyllabusTopics query', () => {
    expect(endpoints).toHaveProperty('getSyllabusTopics')
  })

  it('has createSyllabusTopic mutation', () => {
    expect(endpoints).toHaveProperty('createSyllabusTopic')
  })

  it('has importSyllabusTopics mutation', () => {
    expect(endpoints).toHaveProperty('importSyllabusTopics')
  })

  it('has updateSyllabusTopic mutation', () => {
    expect(endpoints).toHaveProperty('updateSyllabusTopic')
  })

  it('has deleteSyllabusTopic mutation', () => {
    expect(endpoints).toHaveProperty('deleteSyllabusTopic')
  })

  it('has getSyllabusEdges query', () => {
    expect(endpoints).toHaveProperty('getSyllabusEdges')
  })

  it('has getSyllabusProgress query', () => {
    expect(endpoints).toHaveProperty('getSyllabusProgress')
  })

  it('has getSyllabusRevisionRecommendations query', () => {
    expect(endpoints).toHaveProperty('getSyllabusRevisionRecommendations')
  })

  it('has createSyllabusEdge mutation', () => {
    expect(endpoints).toHaveProperty('createSyllabusEdge')
  })

  it('has deleteSyllabusEdge mutation', () => {
    expect(endpoints).toHaveProperty('deleteSyllabusEdge')
  })

  it('has getTaskSyllabusTopics query', () => {
    expect(endpoints).toHaveProperty('getTaskSyllabusTopics')
  })

  it('has setTaskSyllabusTopics mutation', () => {
    expect(endpoints).toHaveProperty('setTaskSyllabusTopics')
  })
})

describe('syllabusApi — Reducer & Metadata', () => {
  it('has reducerPath "syllabusApi"', () => {
    expect(syllabusApi.reducerPath).toBe('syllabusApi')
  })

  it('exports reducer and middleware', () => {
    expect(syllabusApi.reducer).toBeDefined()
    expect(typeof syllabusApi.reducer).toBe('function')
    expect(syllabusApi.middleware).toBeDefined()
    expect(typeof syllabusApi.middleware).toBe('function')
  })
})
