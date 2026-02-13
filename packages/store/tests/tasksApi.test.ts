/**
 * Unit tests for RTK Query API definitions — tasksApi
 */
import { describe, it, expect } from 'vitest'
import { tasksApi } from '../src/services/tasksApi'

describe('tasksApi — Endpoint Configuration', () => {
  const endpoints = tasksApi.endpoints

  // ── Task CRUD ────────────────────────────────────────────────────────

  it('has getTasks query', () => {
    expect(endpoints).toHaveProperty('getTasks')
  })

  it('has getTaskById query', () => {
    expect(endpoints).toHaveProperty('getTaskById')
  })

  it('has createTask mutation', () => {
    expect(endpoints).toHaveProperty('createTask')
  })

  it('has updateTask mutation', () => {
    expect(endpoints).toHaveProperty('updateTask')
  })

  it('has deleteTask mutation', () => {
    expect(endpoints).toHaveProperty('deleteTask')
  })

  it('has toggleTask mutation', () => {
    expect(endpoints).toHaveProperty('toggleTask')
  })

  // ── Smart Create / AI ────────────────────────────────────────────────

  it('has smartCreateTask mutation', () => {
    expect(endpoints).toHaveProperty('smartCreateTask')
  })

  it('has parseTask mutation', () => {
    expect(endpoints).toHaveProperty('parseTask')
  })

  it('has scanSyllabus mutation', () => {
    expect(endpoints).toHaveProperty('scanSyllabus')
  })

  it('has previewSubtasks mutation', () => {
    expect(endpoints).toHaveProperty('previewSubtasks')
  })

  it('has generateSubtasks mutation', () => {
    expect(endpoints).toHaveProperty('generateSubtasks')
  })

  // ── Subtasks ─────────────────────────────────────────────────────────

  it('has createSubTask mutation', () => {
    expect(endpoints).toHaveProperty('createSubTask')
  })

  it('has updateSubTask mutation', () => {
    expect(endpoints).toHaveProperty('updateSubTask')
  })

  it('has deleteSubTask mutation', () => {
    expect(endpoints).toHaveProperty('deleteSubTask')
  })

  // ── Attachments ──────────────────────────────────────────────────────

  it('has createAttachment mutation', () => {
    expect(endpoints).toHaveProperty('createAttachment')
  })

  it('has deleteAttachment mutation', () => {
    expect(endpoints).toHaveProperty('deleteAttachment')
  })

  // ── Recovery ─────────────────────────────────────────────────────────

  it('has previewRecoveryPlan query', () => {
    expect(endpoints).toHaveProperty('previewRecoveryPlan')
  })

  it('has applyRecoveryPlan mutation', () => {
    expect(endpoints).toHaveProperty('applyRecoveryPlan')
  })
})

describe('tasksApi — Reducer & Metadata', () => {
  it('has reducerPath "tasksApi"', () => {
    expect(tasksApi.reducerPath).toBe('tasksApi')
  })

  it('exports the reducer', () => {
    expect(tasksApi.reducer).toBeDefined()
    expect(typeof tasksApi.reducer).toBe('function')
  })

  it('exports middleware', () => {
    expect(tasksApi.middleware).toBeDefined()
    expect(typeof tasksApi.middleware).toBe('function')
  })
})
