import { describe, it, expect } from 'vitest'
import { mentorshipApi } from '../src/services/mentorshipApi'

describe('mentorshipApi — Endpoint Configuration', () => {
  const endpoints = mentorshipApi.endpoints

  it('has getMentorAlertSubscriptions query', () => {
    expect(endpoints).toHaveProperty('getMentorAlertSubscriptions')
  })

  it('has createMentorAlertSubscription mutation', () => {
    expect(endpoints).toHaveProperty('createMentorAlertSubscription')
  })

  it('has updateMentorAlertSubscription mutation', () => {
    expect(endpoints).toHaveProperty('updateMentorAlertSubscription')
  })

  it('has revokeMentorAlertSubscription mutation', () => {
    expect(endpoints).toHaveProperty('revokeMentorAlertSubscription')
  })

  it('has getMentorFeedback query', () => {
    expect(endpoints).toHaveProperty('getMentorFeedback')
  })

  it('has sendMentorFeedback mutation', () => {
    expect(endpoints).toHaveProperty('sendMentorFeedback')
  })
})

describe('mentorshipApi — Reducer & Metadata', () => {
  it('has reducerPath "mentorshipApi"', () => {
    expect(mentorshipApi.reducerPath).toBe('mentorshipApi')
  })

  it('exports reducer and middleware', () => {
    expect(mentorshipApi.reducer).toBeDefined()
    expect(typeof mentorshipApi.reducer).toBe('function')
    expect(mentorshipApi.middleware).toBeDefined()
    expect(typeof mentorshipApi.middleware).toBe('function')
  })
})

