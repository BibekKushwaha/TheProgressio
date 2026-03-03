import { describe, expect, it } from 'vitest';
import { paymentApi } from '../src/services/paymentApi';

describe('paymentApi — Endpoint Configuration', () => {
  const endpoints = paymentApi.endpoints;

  it('has getBillingProfile query endpoint', () => {
    expect(endpoints).toHaveProperty('getBillingProfile');
  });

  it('has createPaymentIntent mutation endpoint', () => {
    expect(endpoints).toHaveProperty('createPaymentIntent');
  });

  it('has createOrder mutation endpoint', () => {
    expect(endpoints).toHaveProperty('createOrder');
  });

  it('has verifyPayment mutation endpoint', () => {
    expect(endpoints).toHaveProperty('verifyPayment');
  });

  it('has getSubscriptionStatus query endpoint', () => {
    expect(endpoints).toHaveProperty('getSubscriptionStatus');
  });

  it('has cancelSubscription mutation endpoint', () => {
    expect(endpoints).toHaveProperty('cancelSubscription');
  });

  it('has getPaymentHistory query endpoint', () => {
    expect(endpoints).toHaveProperty('getPaymentHistory');
  });
});

describe('paymentApi — Reducer & Middleware', () => {
  it('has reducerPath "paymentApi"', () => {
    expect(paymentApi.reducerPath).toBe('paymentApi');
  });

  it('exports reducer and middleware', () => {
    expect(typeof paymentApi.reducer).toBe('function');
    expect(typeof paymentApi.middleware).toBe('function');
  });
});
