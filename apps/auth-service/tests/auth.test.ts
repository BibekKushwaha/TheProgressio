import request from 'supertest'
import { describe, it, beforeEach, expect, vi } from 'vitest'

// Mock bcrypt to avoid native N-API/compile issues in test environment
vi.mock('bcrypt', () => {
  const m = {
    hash: async (p: string) => `hashed-${p}`,
    compare: async (p: string, h: string) => h === `hashed-${p}`,
  }
  return { default: m, ...m }
})

vi.mock('@repo/db/client', () => {
  const user = {
    findFirst: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
  }
  return { prisma: { user } }
})

import app from '../src/index'
import { prisma } from '@repo/db/client'
import bcrypt from 'bcrypt'
import type { use } from 'react'

describe('Auth endpoints', () => {
  beforeEach(() => {
    process.env.JWT_SEC = process.env.JWT_SEC ?? 'testsecret'
    // reinitialize mocked prisma user methods to ensure they are vi.fn()s
    ;(prisma as any).user = {
      findFirst: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
    }
  })

  it('registers a new user', async () => {
    (prisma as any).user.findFirst.mockResolvedValue(null)
    ;(prisma as any).user.create.mockResolvedValue({
      id: '1',
      username: 'Tester',
      email: 'test@example.com',
      createdAt: new Date(),
    })

      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'Tester', email: 'test@example.com', password: 'password', confirmPassword: 'password' })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('success', true)
    expect(res.body).toHaveProperty('user')
    expect(res.headers['set-cookie']).toBeDefined()
  })

  it('logs in an existing user', async () => {
    const hashed = await (bcrypt as any).hash('password', 10)
    ;(prisma as any).user.findUnique.mockResolvedValue({
      id: '1',
      username: 'Tester',
      email: 'test@example.com',
      password: hashed,
    })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('message')
    expect(res.headers['set-cookie']).toBeDefined()
  })
})
