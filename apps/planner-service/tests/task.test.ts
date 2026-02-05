import request from 'supertest'
import { describe, it, beforeEach, expect, vi } from 'vitest'

// Mock auth middleware to inject a test user
vi.mock('../src/middleware/auth.middleware.js', () => ({
  isAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-1', username: 'Tester', email: 'test@example.com', dailyGoalHours: 4 }
    next()
  }
}))

// Mock prisma client used by planner service
vi.mock('@repo/db/client', () => {
  const task = {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
  return { prisma: { task } }
})

import { app } from '../src/index.js'
import { prisma } from '@repo/db/client'

describe('Task endpoints', () => {
  beforeEach(() => {
    ;(prisma as any).task = {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }
  })

  it('creates a new task', async () => {
    const created = {
      id: 't1',
      title: 'New Task',
      userId: 'user-1',
    }
    ;(prisma as any).task.create.mockResolvedValue(created)

    const res = await request(app)
      .post('/api/tasks')
      .send({ title: 'New Task' })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id', 't1')
    expect(res.body).toHaveProperty('title', 'New Task')
  })

  it('fetches tasks list', async () => {
    ;(prisma as any).task.findMany.mockResolvedValue([])

    const res = await request(app)
      .get('/api/tasks')

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})
