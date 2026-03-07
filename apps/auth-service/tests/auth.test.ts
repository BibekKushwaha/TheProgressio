import request from 'supertest'
import { describe, it, beforeEach, expect, vi } from 'vitest'
import jwt from 'jsonwebtoken'

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
    delete: vi.fn(),
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
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  }
  const securityEvent = {
    create: vi.fn(),
  }
  return {
    prisma: {
      user,
      familyShareLink,
      mobileRefreshToken,
      securityEvent,
      $transaction: async (ops: any[]) => Promise.all(ops),
    }
  }
})

import app from '../src/index'
import { prisma } from '@repo/db/client'
import bcrypt from 'bcrypt'

describe('Auth endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.JWT_SEC = process.env.JWT_SEC ?? 'testsecret'
    process.env.ADMIN_BOOTSTRAP_SECRET = 'bootstrap-secret'
    delete process.env.ADMIN_IP_ALLOWLIST
      // reinitialize mocked prisma user methods to ensure they are vi.fn()s
      ; (prisma as any).user = {
        findFirst: vi.fn(),
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      }
      ; (prisma as any).familyShareLink = {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      }
      ; (prisma as any).mobileRefreshToken = {
        create: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
      }
      ; (prisma as any).securityEvent = {
        create: vi.fn(),
      }
  })

  // ─── Registration ─────────────────────────────────────────────────────────

  it('registers a new user', async () => {
    (prisma as any).user.findFirst.mockResolvedValue(null)
      ; (prisma as any).user.create.mockResolvedValue({
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
      ; (prisma as any).user.findUnique.mockResolvedValue({
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
      ; (prisma as any).user.findUnique.mockResolvedValue({
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

  // ─── Account export/delete ─────────────────────────────────────────────

  it('rejects export without auth', async () => {
    const res = await request(app).get('/api/auth/export')
    expect(res.status).toBe(401)
  })

  it('exports account data with auth cookie', async () => {
    const token = jwt.sign(
      { id: 'u1' },
      process.env.JWT_SEC as string,
      { expiresIn: '1h', issuer: 'transition-auth', audience: 'transition-web' },
    )
      ; (prisma as any).user.findUnique.mockResolvedValue({
        id: 'u1',
        username: 'Tester',
        email: 'test@example.com',
        createdAt: new Date(),
        categories: [],
        tasks: [],
        habits: [],
        nudges: [],
        gradeEntries: [],
        courseGrades: [],
        paymentEvents: [],
        syncOperations: [],
        attendance: [],
        subjects: [],
        exams: [],
        studyGoals: [],
        timetable: [],
        rotationPatterns: [],
        holidays: [],
        achievements: [],
        notes: [],
        auditLogs: [],
        conversations: [],
        familyShareLinks: [],
        pushSubscriptions: [],
        oauthAccounts: [],
      })

    const res = await request(app)
      .get('/api/auth/export')
      .set('Cookie', [`token=${token}`])

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('export')
    expect(res.body.export.user).toHaveProperty('id', 'u1')
  })

  it('deletes account only with confirmation', async () => {
    const token = jwt.sign(
      { id: 'u1' },
      process.env.JWT_SEC as string,
      { expiresIn: '1h', issuer: 'transition-auth', audience: 'transition-web' },
    )
      ; (prisma as any).user.delete.mockResolvedValue({ id: 'u1' })

    const bad = await request(app)
      .delete('/api/auth/account')
      .set('Cookie', [`token=${token}`])
      .send({ confirm: 'no' })
    expect(bad.status).toBe(400)

    const ok = await request(app)
      .delete('/api/auth/account')
      .set('Cookie', [`token=${token}`])
      .send({ confirm: 'DELETE' })

    expect(ok.status).toBe(200)
    expect(ok.body).toHaveProperty('message')
  })

  it('denies bootstrap admin routes from non-allowlisted IPs', async () => {
    process.env.ADMIN_IP_ALLOWLIST = '203.0.113.10'

    const res = await request(app)
      .post('/api/auth/admin/promote')
      .set('x-admin-bootstrap-secret', 'bootstrap-secret')
      .set('x-forwarded-for', '198.51.100.23')
      .send({ email: 'target@example.com' })

    expect(res.status).toBe(403)
    expect(res.body).toMatchObject({
      message: 'Admin bootstrap access denied from this IP address.',
    })
  })

  it('rate limits bootstrap admin routes', async () => {
    ; (prisma as any).user.findUnique.mockResolvedValue({
      id: 'u-admin-target',
      username: 'Target',
      role: 'USER',
    })
    ; (prisma as any).user.update.mockResolvedValue({
      id: 'u-admin-target',
      role: 'ADMIN',
    })

    let response = null as Awaited<ReturnType<typeof request>> | null

    for (let attempt = 0; attempt < 11; attempt += 1) {
      response = await request(app)
        .post('/api/auth/admin/promote')
        .set('x-admin-bootstrap-secret', 'bootstrap-secret')
        .send({ email: 'target@example.com' })
    }

    expect(response?.status).toBe(429)
    expect(response?.body).toMatchObject({
      message: 'Too many admin bootstrap attempts, please try again later.',
    })
  })
})
