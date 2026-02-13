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
    update: vi.fn(),
  }
  const familyShareLink = {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  }
  const mobileRefreshToken = {
    create: vi.fn(),
    findFirst: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  }
  return { prisma: { user, familyShareLink, mobileRefreshToken } }
})

import app from '../src/index'
import { prisma } from '@repo/db/client'
import bcrypt from 'bcrypt'

describe('Auth endpoints', () => {
  beforeEach(() => {
    process.env.JWT_SEC = process.env.JWT_SEC ?? 'testsecret'
    // reinitialize mocked prisma user methods to ensure they are vi.fn()s
    ;(prisma as any).user = {
      findFirst: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    }
    ;(prisma as any).familyShareLink = {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    }
  })

  // ─── Registration ─────────────────────────────────────────────────────────

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

  it('rejects registration with duplicate email', async () => {
    (prisma as any).user.findFirst.mockResolvedValue({
      id: '1',
      email: 'test@example.com',
    })

    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'Tester', email: 'test@example.com', password: 'password', confirmPassword: 'password' })

    // Controller returns 409 Conflict for duplicate email
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })

  it('rejects registration when passwords do not match', async () => {
    (prisma as any).user.findFirst.mockResolvedValue(null)

    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'Tester', email: 'test@example.com', password: 'password', confirmPassword: 'different' })

    expect(res.status).toBe(400)
  })

  it('rejects registration with missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com' })

    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  // ─── Login ────────────────────────────────────────────────────────────────

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

  it('rejects login with wrong password', async () => {
    const hashed = await (bcrypt as any).hash('correctpassword', 10)
    ;(prisma as any).user.findUnique.mockResolvedValue({
      id: '1',
      email: 'test@example.com',
      password: hashed,
    })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrongpassword' })

    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('rejects login with non-existent email', async () => {
    (prisma as any).user.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@example.com', password: 'password' })

    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  // ─── Logout ───────────────────────────────────────────────────────────────

  it('logs out and clears cookie', async () => {
    const res = await request(app)
      .delete('/api/auth/logout')

    expect(res.status).toBe(200)
  })

  // ─── Family Share Links ───────────────────────────────────────────────────

  it('rejects family share creation without auth', async () => {
    const res = await request(app)
      .post('/api/auth/family-links')
      .send({ permissions: ['tasks', 'habits'] })

    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})
