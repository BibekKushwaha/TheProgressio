import { beforeEach, describe, expect, it, vi } from 'vitest';

const { verifyMock, findUniqueMock, updateMock } = vi.hoisted(() => ({
	verifyMock: vi.fn(),
	findUniqueMock: vi.fn(),
	updateMock: vi.fn(),
}));

vi.mock('jsonwebtoken', () => ({
	default: {
		verify: verifyMock,
	},
}));

vi.mock('@repo/cache', () => ({}));

vi.mock('@repo/db', () => ({
	prisma: {
		user: {
			findUnique: findUniqueMock,
			update: updateMock,
		},
		familyShareLink: {
			findFirst: vi.fn(),
			update: vi.fn(),
		},
	},
}));

vi.mock('../src/services/internal-http.service.js', () => ({
	postJsonRequest: vi.fn(),
}));

import { isAuth } from '../src/middleware/auth.middleware.js';

describe('planner auth.middleware', () => {
	beforeEach(() => {
		process.env.JWT_SEC = 'testsecret';
		verifyMock.mockReset();
		findUniqueMock.mockReset();
		updateMock.mockReset();

		verifyMock.mockReturnValue({ id: 'user-1' });
		findUniqueMock.mockResolvedValue({
			id: 'user-1',
			username: 'Planner User',
			email: 'planner@example.com',
			dailyGoalHours: 4,
			role: 'USER',
		});
		updateMock.mockResolvedValue(undefined);
	});

	it('verifies JWTs with HS256 only', async () => {
		const next = vi.fn();
		const req = {
			headers: { authorization: 'Bearer signed.jwt.token' },
			cookies: {},
		} as any;

		await isAuth(req, {} as any, next);

		expect(verifyMock).toHaveBeenCalledWith('signed.jwt.token', 'testsecret', {
			algorithms: ['HS256'],
		});
		expect(next).toHaveBeenCalledWith();
	});
});
