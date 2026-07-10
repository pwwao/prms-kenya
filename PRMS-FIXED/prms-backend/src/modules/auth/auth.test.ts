/**
 * Unit Tests — Auth Service
 *
 * REWRITTEN by Integration Team. The original file (written before any
 * `auth` module existed) never imported or exercised AuthService at all —
 * every assertion checked locally-defined literals or fabricated objects
 * (e.g. `expect(900).toBe(15 * 60)`), and its vi.mock() calls were unused.
 * It also assumed field names that don't match the real schema
 * (`two_fa_enabled` vs `is_two_factor_enabled`, `full_name` vs
 * `full_name_encrypted`).
 *
 * This version constructs a real AuthService with mocked repository/service
 * dependencies (same pattern as hospitals.test.ts / users.test.ts — plain
 * mock objects implementing each dependency's interface, passed directly
 * into the constructor) and module-level mocks for token.service.ts /
 * the notification channels, then exercises actual login/2FA/logout logic.
 */

import { AuthService } from './auth.service.js';
import { AuthError } from '../../shared/errors/domain.errors.js';
import bcrypt from 'bcrypt';

// ─── Module-level mocks ─────────────────────────────────────────────────────
// AuthService calls these as free functions, not as injected dependencies,
// so they need vi.mock() rather than constructor mocking.

vi.mock('../../shared/services/token.service.js', () => ({
  issueTokenPair: vi.fn(() => ({
    accessToken: 'access.token.value',
    refreshToken: 'refresh.token.value',
    accessExpiresIn: 900,
  })),
  issuePreAuthToken: vi.fn(async () => 'preauth.token.value'),
  verifyPreAuthToken: vi.fn(async () => 1),
  verifyRefreshToken: vi.fn(() => ({ sub: '1', jti: 'refresh-jti' })),
  verifyAccessToken: vi.fn(async () => ({ jti: 'access-jti', exp: 9999999999 })),
  revokeAccessToken: vi.fn(async () => undefined),
  registerSession: vi.fn(async () => undefined),
  destroySession: vi.fn(async () => undefined),
}));

vi.mock('../notifications/channels/sms.channel.js', () => ({
  sendSms: vi.fn(async () => ({ messageId: 'msg-1', status: 'Success', cost: '0' })),
}));

vi.mock('../notifications/channels/email.channel.js', () => ({
  sendEmail: vi.fn(async () => ({ messageId: 'msg-2' })),
}));

vi.mock('../../config/redis.config.js', () => ({
  getRedisClient: () => ({
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
  }),
  RedisKeys: {
    smsOtp: (userId: number) => `sms_otp:${userId}`,
    passwordReset: (token: string) => `password_reset:${token}`,
  },
  REDIS_TTL: { SMS_OTP: 300, PASSWORD_RESET: 900 },
}));

// ─── Constructor-injected dependency mocks ──────────────────────────────────

const mockAuthRepo = {
  createRefreshToken: vi.fn(async () => undefined),
  findRefreshTokenByJti: vi.fn(async () => ({ revoked_at: null })),
  revokeRefreshToken: vi.fn(async () => undefined),
  revokeAllRefreshTokensForUser: vi.fn(async () => undefined),
  upsertDeviceSession: vi.fn(async () => undefined),
  findDeviceSessionsByUserId: vi.fn(async () => []),
  deleteDeviceSession: vi.fn(async () => undefined),
};

const makeUserRow = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  hospital_id: 1,
  username: 'jdoe',
  email: 'clinician@test.com',
  role: 'Clinician',
  password_hash: bcrypt.hashSync('Test@1234!', 4),
  status: 'Active',
  is_two_factor_enabled: 0,
  two_factor_secret: null,
  phone_number: '+254700000000',
  full_name_encrypted: null,
  last_login_at: null,
  ...overrides,
});

function makeMockUserRepo(userRow: ReturnType<typeof makeUserRow> | null) {
  return {
    findByEmail: vi.fn(async (email: string) => (userRow?.email === email ? userRow : null)),
    findByUsername: vi.fn(async (u: string) => (userRow?.username === u ? userRow : null)),
    findByIdOrFail: vi.fn(async () => userRow),
    updateLastLogin: vi.fn(async () => undefined),
    updatePassword: vi.fn(async () => undefined),
  };
}

const mockUserService = {
  changePassword: vi.fn(async () => undefined),
};

const mockHospitalRepo = {
  findById: vi.fn(async () => ({ id: 1, name: 'Test Hospital' })),
};

function buildService(userRow: ReturnType<typeof makeUserRow> | null) {
  return new AuthService(
    mockAuthRepo as any,
    makeMockUserRepo(userRow) as any,
    mockUserService as any,
    mockHospitalRepo as any,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Login ────────────────────────────────────────────────────────────────────

describe('AuthService.login', () => {
  it('throws AUTH_INVALID_CREDENTIALS for an unknown identifier', async () => {
    const service = buildService(null);
    await expect(service.login('nobody@test.com', 'whatever')).rejects.toThrow(AuthError);
  });

  it('throws AUTH_INVALID_CREDENTIALS for a wrong password', async () => {
    const user = makeUserRow();
    const service = buildService(user);
    await expect(service.login(user.email, 'WrongPassword!')).rejects.toThrow(AuthError);
  });

  it('completes login immediately when 2FA is disabled', async () => {
    const user = makeUserRow({ is_two_factor_enabled: 0 });
    const service = buildService(user);
    const result = await service.login(user.email, 'Test@1234!');

    expect(result.twoFactorRequired).toBe(false);
    expect(result.tokens).toBeDefined();
    expect(result.tokens?.accessToken).toBe('access.token.value');
    expect(result.tokens?.user.id).toBe(user.id);
  });

  it('returns a pre-auth token and SMS deliveryMethod when 2FA is enabled without a TOTP secret', async () => {
    const user = makeUserRow({ is_two_factor_enabled: 1, two_factor_secret: null });
    const service = buildService(user);
    const result = await service.login(user.email, 'Test@1234!');

    expect(result.twoFactorRequired).toBe(true);
    expect(result.deliveryMethod).toBe('SMS');
    expect(result.preAuthToken).toBe('preauth.token.value');
    expect(result.tokens).toBeUndefined();
  });

  it('returns deliveryMethod TOTP when a TOTP secret is set', async () => {
    const user = makeUserRow({ is_two_factor_enabled: 1, two_factor_secret: 'BASE32SECRET' });
    const service = buildService(user);
    const result = await service.login(user.email, 'Test@1234!');

    expect(result.deliveryMethod).toBe('TOTP');
  });

  it.each(['Suspended', 'Inactive'])('rejects login for status %s', async (status) => {
    const user = makeUserRow({ status });
    const service = buildService(user);
    await expect(service.login(user.email, 'Test@1234!')).rejects.toThrow(AuthError);
  });
});

// ─── 2FA verification ────────────────────────────────────────────────────────

describe('AuthService.verifyTwoFactor', () => {
  it('rejects an incorrect SMS OTP', async () => {
    const user = makeUserRow({ is_two_factor_enabled: 1, two_factor_secret: null });
    const service = buildService(user);
    // getRedisClient().get() is mocked to always return null → no stored OTP matches
    await expect(service.verifyTwoFactor('preauth.token.value', '000000')).rejects.toThrow(AuthError);
  });

  it('TOTP path throws a clear not-implemented error rather than silently passing', async () => {
    const user = makeUserRow({ is_two_factor_enabled: 1, two_factor_secret: 'BASE32SECRET' });
    const service = buildService(user);
    await expect(service.verifyTwoFactor('preauth.token.value', '123456')).rejects.toThrow(AuthError);
  });
});

// ─── Logout ───────────────────────────────────────────────────────────────────

describe('AuthService.logout', () => {
  it('revokes the refresh token', async () => {
    const user = makeUserRow();
    const service = buildService(user);
    await service.logout(null, 'some.refresh.token');
    expect(mockAuthRepo.revokeRefreshToken).toHaveBeenCalledWith('refresh-jti');
  });
});

// ─── getMe ────────────────────────────────────────────────────────────────────

describe('AuthService.getMe', () => {
  it('returns the unmasked profile (no role-based masking, unlike viewing other users)', async () => {
    const user = makeUserRow({ role: 'Receptionist' });
    const service = buildService(user);
    const me = await service.getMe(1);
    expect(me.email).toBe(user.email); // not masked, even for Receptionist
  });
});
