import { describe, it, expect, beforeEach } from 'vitest'
import { resetRedisClientForTests } from '../src/client'
import { getUserCache, setUserCache, deleteUserCache } from '../src/userCache'

describe('userCache helpers', () => {
  beforeEach(() => {
    resetRedisClientForTests()
  })

  it('sets and gets a user cache value', async () => {
    const userId = 'u1'
    const payload = { id: userId, username: 'u1', email: 'u1@example.com' }

    await setUserCache(userId, payload)
    const got = await getUserCache(userId)

    expect(got).toEqual(expect.objectContaining({ id: userId, username: 'u1' }))
  })

  it('deletes a user cache value', async () => {
    const userId = 'u2'
    const payload = { id: userId, username: 'u2' }

    await setUserCache(userId, payload)
    const before = await getUserCache(userId)
    expect(before).not.toBeNull()

    const deleted = await deleteUserCache(userId)
    expect(deleted).toBe(true)

    const after = await getUserCache(userId)
    expect(after).toBeNull()
  })
})
