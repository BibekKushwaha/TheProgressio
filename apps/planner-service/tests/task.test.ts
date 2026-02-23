import request from 'supertest'
import { describe, it, beforeEach, expect, vi } from 'vitest'

// ─── Mocks ──────────────────────────────────────────────────────────────────────

// Mock auth middleware to inject a test user
vi.mock('../src/middleware/auth.middleware.js', () => ({
  isAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-1', username: 'Tester', email: 'test@example.com', dailyGoalHours: 4 }
    next()
  },
  enforceReadOnlyWrites: (_req: any, _res: any, next: any) => next(),
}))

// Mock BullMQ producer (non-blocking)
vi.mock('../src/services/queue.service.js', () => ({
  emitTaskEvent: vi.fn().mockResolvedValue(undefined),
  emitPushEvent: vi.fn().mockResolvedValue(undefined),
  QUEUE_NAMES: {
    TASK_EVENTS: "planner.task.events",
    TASK_ANALYTICS: "planner.task.analytics",
    HABIT_TRIGGERS: "planner.habit.triggers",
    WEB_PUSH: "planner.web.push",
  },
  TaskEventType: {
    TASK_CREATED: 'task.created',
    TASK_UPDATED: 'task.updated',
    TASK_COMPLETED: 'task.completed',
    TASK_DELETED: 'task.deleted',
    TASK_STATUS_CHANGED: 'task.status_changed',
  },
  producer: { close: vi.fn() },
}))

// Mock AI service
vi.mock('../src/services/ai.service.js', () => ({
  aiService: {
    parseTaskIntent: vi.fn().mockResolvedValue({
      title: 'Chemistry lab report',
      priority: 'HIGH',
      dueDate: new Date('2026-02-14'),
      subject: 'Chemistry',
    }),
    scanSyllabusImage: vi.fn().mockResolvedValue([
      {
        title: 'Physics Chapter 1 Revision',
        dueDate: new Date('2026-02-20'),
        priority: 'MEDIUM',
        subject: 'Physics',
      },
    ]),
    generateSubtasks: vi.fn().mockResolvedValue([
      'Gather materials',
      'Write introduction',
      'Complete analysis',
    ]),
  }
}))

// Mock prisma client
vi.mock('@repo/db', () => {
  const Status = { PENDING: 'PENDING', IN_PROGRESS: 'IN_PROGRESS', COMPLETED: 'COMPLETED' }
  const Priority = { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH' }
  return {
    prisma: {
      task: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      category: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      subTask: {
        create: vi.fn(),
        createMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      attachment: {
        create: vi.fn(),
        findUnique: vi.fn(),
        delete: vi.fn(),
      },
      rotationPattern: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    },
    Status,
    Priority,
    AttendanceStatus: { PRESENT: 'PRESENT', ABSENT: 'ABSENT', LATE: 'LATE' },
    AttendanceMethod: { QR: 'QR', MANUAL: 'MANUAL', GEOFENCE: 'GEOFENCE' },
  }
})

import { app } from '../src/index.js'
import { prisma } from '@repo/db'
import { emitTaskEvent } from '../src/services/queue.service.js'

// ─── Task CRUD Tests ────────────────────────────────────────────────────────────

describe('Task endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // CREATE
  it('creates a new task and emits task.created event', async () => {
    const created = { id: 't1', title: 'New Task', userId: 'user-1', status: 'PENDING', priority: 'MEDIUM' }
      ; (prisma.task.create as any).mockResolvedValue(created)

    const res = await request(app)
      .post('/api/tasks')
      .send({ title: 'New Task' })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id', 't1')
    expect(res.body).toHaveProperty('title', 'New Task')
    expect(emitTaskEvent).toHaveBeenCalledWith(
      'task.created', 't1', 'user-1',
      expect.objectContaining({ title: 'New Task' })
    )
  })

  it('returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({})

    expect(res.status).toBe(400)
    expect(res.body.message).toContain('Title is required')
  })

  // GET ALL
  it('fetches tasks list with filters', async () => {
    ; (prisma.task.findMany as any).mockResolvedValue([
      { id: 't1', title: 'Task 1', status: 'PENDING' },
    ])

    const res = await request(app)
      .get('/api/tasks?status=PENDING&page=1&limit=5')

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(1)
  })

  it('fetches tasks with search query', async () => {
    ; (prisma.task.findMany as any).mockResolvedValue([])

    const res = await request(app)
      .get('/api/tasks?search=chemistry')

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  // GET BY ID
  it('gets a task by ID', async () => {
    const task = { id: 't1', title: 'Task 1', userId: 'user-1', subtasks: [], attachments: [] }
      ; (prisma.task.findUnique as any).mockResolvedValue(task)

    const res = await request(app).get('/api/tasks/t1')

    expect(res.status).toBe(200)
    expect(res.body.id).toBe('t1')
  })

  it('returns 404 for non-existent task', async () => {
    ; (prisma.task.findUnique as any).mockResolvedValue(null)

    const res = await request(app).get('/api/tasks/non-existent')

    expect(res.status).toBe(404)
  })

  it('returns 403 when user does not own the task', async () => {
    ; (prisma.task.findUnique as any).mockResolvedValue({ id: 't1', userId: 'other-user' })

    const res = await request(app).get('/api/tasks/t1')

    expect(res.status).toBe(403)
  })

  // UPDATE
  it('updates a task and emits task.updated event', async () => {
    const existing = { id: 't1', userId: 'user-1', status: 'PENDING', title: 'Old' }
    const updated = { ...existing, title: 'Updated', status: 'PENDING' }
      ; (prisma.task.findUnique as any).mockResolvedValue(existing)
      ; (prisma.task.update as any).mockResolvedValue(updated)

    const res = await request(app)
      .patch('/api/tasks/t1')
      .send({ title: 'Updated' })

    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Updated')
    expect(emitTaskEvent).toHaveBeenCalledWith(
      'task.updated', 't1', 'user-1',
      expect.objectContaining({ changedFields: expect.objectContaining({ title: 'Updated' }) })
    )
  })

  it('emits task.completed when status changes to COMPLETED via update', async () => {
    const existing = { id: 't1', userId: 'user-1', status: 'IN_PROGRESS', title: 'Task' }
    const updated = { ...existing, status: 'COMPLETED' }
      ; (prisma.task.findUnique as any).mockResolvedValue(existing)
      ; (prisma.task.update as any).mockResolvedValue(updated)

    const res = await request(app)
      .patch('/api/tasks/t1')
      .send({ status: 'COMPLETED' })

    expect(res.status).toBe(200)
    // Should emit both TASK_UPDATED and TASK_COMPLETED
    expect(emitTaskEvent).toHaveBeenCalledTimes(2)
    expect(emitTaskEvent).toHaveBeenCalledWith(
      'task.completed', 't1', 'user-1',
      expect.objectContaining({ title: 'Task' })
    )
  })

  // DELETE
  it('deletes a task and emits task.deleted event', async () => {
    const existing = { id: 't1', userId: 'user-1', status: 'PENDING', title: 'To Delete' }
      ; (prisma.task.findUnique as any).mockResolvedValue(existing)
      ; (prisma.task.delete as any).mockResolvedValue(existing)

    const res = await request(app).delete('/api/tasks/t1')

    expect(res.status).toBe(200)
    expect(res.body.message).toContain('deleted')
    expect(emitTaskEvent).toHaveBeenCalledWith(
      'task.deleted', 't1', 'user-1',
      expect.objectContaining({ title: 'To Delete' })
    )
  })

  it('returns 404 when deleting non-existent task', async () => {
    ; (prisma.task.findUnique as any).mockResolvedValue(null)

    const res = await request(app).delete('/api/tasks/non-existent')

    expect(res.status).toBe(404)
  })

  // TOGGLE
  it('toggles PENDING → IN_PROGRESS and emits status_changed', async () => {
    const existing = { id: 't1', userId: 'user-1', status: 'PENDING', title: 'Task' }
    const toggled = { ...existing, status: 'IN_PROGRESS' }
      ; (prisma.task.findUnique as any).mockResolvedValue(existing)
      ; (prisma.task.update as any).mockResolvedValue(toggled)

    const res = await request(app).patch('/api/tasks/t1/toggle')

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('IN_PROGRESS')
    expect(emitTaskEvent).toHaveBeenCalledWith(
      'task.status_changed', 't1', 'user-1',
      expect.objectContaining({ previousStatus: 'PENDING', newStatus: 'IN_PROGRESS' })
    )
  })

  it('toggles IN_PROGRESS → COMPLETED and emits both status_changed + completed', async () => {
    const existing = { id: 't1', userId: 'user-1', status: 'IN_PROGRESS', title: 'Task' }
    const toggled = { ...existing, status: 'COMPLETED' }
      ; (prisma.task.findUnique as any).mockResolvedValue(existing)
      ; (prisma.task.update as any).mockResolvedValue(toggled)

    const res = await request(app).patch('/api/tasks/t1/toggle')

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('COMPLETED')
    // Should emit status_changed AND task.completed
    expect(emitTaskEvent).toHaveBeenCalledTimes(2)
    expect(emitTaskEvent).toHaveBeenCalledWith(
      'task.completed', 't1', 'user-1',
      expect.objectContaining({ title: 'Task' })
    )
  })

  it('toggles COMPLETED → PENDING', async () => {
    const existing = { id: 't1', userId: 'user-1', status: 'COMPLETED', title: 'Task' }
    const toggled = { ...existing, status: 'PENDING' }
      ; (prisma.task.findUnique as any).mockResolvedValue(existing)
      ; (prisma.task.update as any).mockResolvedValue(toggled)

    const res = await request(app).patch('/api/tasks/t1/toggle')

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('PENDING')
  })

  // SMART CREATE (NLP)
  it('smart-creates task from NLP input', async () => {
    const created = { id: 't2', title: 'Chemistry lab report', userId: 'user-1', status: 'PENDING', priority: 'HIGH' }
      ; (prisma.task.create as any).mockResolvedValue(created)

    const res = await request(app)
      .post('/api/tasks/smart-create')
      .send({ text: 'Chemistry lab report due Friday at 5pm!! p1' })

    expect(res.status).toBe(201)
    expect(res.body.task.title).toBe('Chemistry lab report')
    expect(emitTaskEvent).toHaveBeenCalledWith(
      'task.created', 't2', 'user-1',
      expect.objectContaining({ source: 'nlp-smart-create' })
    )
  })

  it('returns 400 for smart-create without text', async () => {
    const res = await request(app)
      .post('/api/tasks/smart-create')
      .send({})

    expect(res.status).toBe(400)
  })

  // PARSE (NLP without creating)
  it('parses task intent without creating', async () => {
    const res = await request(app)
      .post('/api/tasks/parse')
      .send({ text: 'Study for Math exam next Monday' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('title')
  })

  it('scans syllabus image and returns extracted items', async () => {
    const sampleImageBase64 = Buffer.from('fake-image-content').toString('base64')
    const res = await request(app)
      .post('/api/tasks/scan-syllabus')
      .send({ imageBase64: sampleImageBase64, mimeType: 'image/png' })

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.items)).toBe(true)
    expect(res.body.items[0]).toHaveProperty('title', 'Physics Chapter 1 Revision')
  })

  it('returns 400 for scan-syllabus without image payload', async () => {
    const res = await request(app)
      .post('/api/tasks/scan-syllabus')
      .send({})

    expect(res.status).toBe(400)
  })

  // GENERATE SUBTASKS
  it('generates AI subtasks for an existing task', async () => {
    const task = { id: 't1', title: 'Term Paper', description: '', userId: 'user-1' }
    const updatedTask = { ...task, subtasks: [{ title: 'Gather materials' }, { title: 'Write introduction' }, { title: 'Complete analysis' }] }
      ; (prisma.task.findUnique as any)
        .mockResolvedValueOnce(task)
        .mockResolvedValueOnce(updatedTask)
      ; (prisma.subTask.createMany as any).mockResolvedValue({ count: 3 })

    const res = await request(app).post('/api/tasks/t1/subtasks')

    expect(res.status).toBe(200)
    expect(res.body.subtasks).toHaveLength(3)
  })

  // PREVIEW SUBTASKS
  it('previews subtasks without persisting', async () => {
    const res = await request(app)
      .post('/api/tasks/preview-subtasks')
      .send({ title: 'Term Paper' })

    expect(res.status).toBe(200)
    expect(res.body.subtasks).toHaveLength(3)
  })

  // WHATSAPP CAPTURE
  it('captures a task from WhatsApp payload', async () => {
    process.env.WHATSAPP_WEBHOOK_SECRET = 'wa-secret'
    const created = { id: 't3', title: 'Chemistry lab report', userId: 'user-1', status: 'PENDING', priority: 'HIGH' }
      ; (prisma.task.create as any).mockResolvedValue(created)

    const res = await request(app)
      .post('/api/integrations/whatsapp/capture')
      .set('x-whatsapp-secret', 'wa-secret')
      .send({
        userId: 'user-1',
        text: 'Biology quiz next Friday at 9 AM!! p1',
        from: '15550001111',
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('task.id', 't3')
    expect(emitTaskEvent).toHaveBeenCalledWith(
      'task.created', 't3', 'user-1',
      expect.objectContaining({ source: 'whatsapp-capture' })
    )

    delete process.env.WHATSAPP_WEBHOOK_SECRET
  })

  it('returns 400 when WhatsApp payload does not resolve a user', async () => {
    const res = await request(app)
      .post('/api/integrations/whatsapp/capture')
      .send({ text: 'Create task from WhatsApp' })

    expect(res.status).toBe(400)
    expect(res.body.message).toContain('User not found')
  })

  it('verifies WhatsApp webhook challenge', async () => {
    process.env.WHATSAPP_VERIFY_TOKEN = 'verify-token'

    const res = await request(app)
      .get('/api/integrations/whatsapp/webhook')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'verify-token',
        'hub.challenge': 'challenge-123',
      })

    expect(res.status).toBe(200)
    expect(res.text).toBe('challenge-123')

    delete process.env.WHATSAPP_VERIFY_TOKEN
  })
})

// ─── Category Tests ─────────────────────────────────────────────────────────────

describe('Category endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a category with icon', async () => {
    const created = { id: 'c1', name: 'Math', colorCode: '#FF0000', icon: 'Calculator', userId: 'user-1' }
      ; (prisma.category.create as any).mockResolvedValue(created)

    const res = await request(app)
      .post('/api/categories')
      .send({ name: 'Math', colorCode: '#FF0000', icon: 'Calculator' })

    expect(res.status).toBe(201)
    expect(res.body.icon).toBe('Calculator')
  })

  it('creates a category without icon (null default)', async () => {
    const created = { id: 'c2', name: 'Science', colorCode: '#3B82F6', icon: null, userId: 'user-1' }
      ; (prisma.category.create as any).mockResolvedValue(created)

    const res = await request(app)
      .post('/api/categories')
      .send({ name: 'Science' })

    expect(res.status).toBe(201)
    expect(res.body.icon).toBeNull()
  })

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/categories')
      .send({})

    expect(res.status).toBe(400)
  })

  it('fetches all categories with task count', async () => {
    ; (prisma.category.findMany as any).mockResolvedValue([
      { id: 'c1', name: 'Math', _count: { tasks: 5 } },
    ])

    const res = await request(app).get('/api/categories')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0]._count.tasks).toBe(5)
  })

  it('gets category by ID', async () => {
    ; (prisma.category.findUnique as any).mockResolvedValue({
      id: 'c1', name: 'Math', userId: 'user-1', tasks: []
    })

    const res = await request(app).get('/api/categories/c1')

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Math')
  })

  it('returns 403 when accessing another user\u2019s category', async () => {
    ; (prisma.category.findUnique as any).mockResolvedValue({
      id: 'c1', name: 'Math', userId: 'other-user'
    })

    const res = await request(app).get('/api/categories/c1')

    expect(res.status).toBe(403)
  })

  it('updates category name, color, and icon', async () => {
    const existing = { id: 'c1', userId: 'user-1', name: 'Math', colorCode: '#FF0000', icon: null }
    const updated = { ...existing, name: 'Mathematics', icon: 'BookOpen' }
      ; (prisma.category.findUnique as any).mockResolvedValue(existing)
      ; (prisma.category.update as any).mockResolvedValue(updated)

    const res = await request(app)
      .patch('/api/categories/c1')
      .send({ name: 'Mathematics', icon: 'BookOpen' })

    expect(res.status).toBe(200)
    expect(res.body.icon).toBe('BookOpen')
  })

  it('deletes a category', async () => {
    const existing = { id: 'c1', userId: 'user-1' }
      ; (prisma.category.findUnique as any).mockResolvedValue(existing)
      ; (prisma.category.delete as any).mockResolvedValue(existing)

    const res = await request(app).delete('/api/categories/c1')

    expect(res.status).toBe(200)
    expect(res.body.message).toContain('deleted')
  })

  it('returns 400 on duplicate category name', async () => {
    ; (prisma.category.create as any).mockRejectedValue({ code: 'P2002' })

    const res = await request(app)
      .post('/api/categories')
      .send({ name: 'Duplicate' })

    expect(res.status).toBe(400)
    expect(res.body.message).toContain('unique')
  })
})

// ─── Rotation Pattern Tests ─────────────────────────────────────────────────────

describe('Rotation pattern endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a custom rotation pattern', async () => {
    const created = {
      id: 'r1', name: 'Week A/B', pattern: ['A', 'B'],
      startDate: '2026-01-05T00:00:00.000Z', cycleLengthDays: 7,
      userId: 'user-1', isActive: true
    }
      ; (prisma.rotationPattern.create as any).mockResolvedValue(created)

    const res = await request(app)
      .post('/api/rotations')
      .send({ name: 'Week A/B', pattern: ['A', 'B'], startDate: '2026-01-05' })

    expect(res.status).toBe(201)
    expect(res.body.pattern).toEqual(['A', 'B'])
  })

  it('returns 400 when pattern has less than 2 labels', async () => {
    const res = await request(app)
      .post('/api/rotations')
      .send({ name: 'Bad', pattern: ['A'], startDate: '2026-01-05' })

    expect(res.status).toBe(400)
    expect(res.body.message).toContain('at least 2 labels')
  })

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/rotations')
      .send({ pattern: ['A', 'B'], startDate: '2026-01-05' })

    expect(res.status).toBe(400)
  })

  it('fetches all rotation patterns', async () => {
    ; (prisma.rotationPattern.findMany as any).mockResolvedValue([
      { id: 'r1', name: 'Week A/B', pattern: ['A', 'B'] },
    ])

    const res = await request(app).get('/api/rotations')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })

  it('resolves rotation using custom pattern', async () => {
    const pattern = {
      id: 'r1', name: 'Week A/B', pattern: ['A', 'B'],
      startDate: new Date('2026-01-05'), cycleLengthDays: 7,
      userId: 'user-1', isActive: true
    }
      ; (prisma.rotationPattern.findFirst as any).mockResolvedValue(pattern)

    const res = await request(app).get('/api/rotations/resolve?date=2026-02-10')

    expect(res.status).toBe(200)
    expect(res.body.source).toBe('custom-pattern')
    expect(['A', 'B']).toContain(res.body.rotation)
  })

  it('falls back to algorithmic rotation when no pattern defined', async () => {
    ; (prisma.rotationPattern.findFirst as any).mockResolvedValue(null)

    const res = await request(app).get('/api/rotations/resolve?date=2026-02-10')

    expect(res.status).toBe(200)
    expect(res.body.source).toBe('algorithmic-fallback')
    expect(['A', 'B']).toContain(res.body.rotation)
  })

  it('updates a rotation pattern', async () => {
    const existing = { id: 'r1', userId: 'user-1', name: 'Old', pattern: ['A', 'B'] }
    const updated = { ...existing, name: 'Block Schedule', pattern: ['1', '2', '3', '4'] }
      ; (prisma.rotationPattern.findUnique as any).mockResolvedValue(existing)
      ; (prisma.rotationPattern.update as any).mockResolvedValue(updated)

    const res = await request(app)
      .patch('/api/rotations/r1')
      .send({ name: 'Block Schedule', pattern: ['1', '2', '3', '4'], cycleLengthDays: 1 })

    expect(res.status).toBe(200)
    expect(res.body.pattern).toEqual(['1', '2', '3', '4'])
  })

  it('deletes a rotation pattern', async () => {
    const existing = { id: 'r1', userId: 'user-1' }
      ; (prisma.rotationPattern.findUnique as any).mockResolvedValue(existing)
      ; (prisma.rotationPattern.delete as any).mockResolvedValue(existing)

    const res = await request(app).delete('/api/rotations/r1')

    expect(res.status).toBe(200)
    expect(res.body.message).toContain('deleted')
  })

  it('returns 403 when modifying another user\u2019s pattern', async () => {
    ; (prisma.rotationPattern.findUnique as any).mockResolvedValue({
      id: 'r1', userId: 'other-user'
    })

    const res = await request(app).delete('/api/rotations/r1')

    expect(res.status).toBe(403)
  })
})
