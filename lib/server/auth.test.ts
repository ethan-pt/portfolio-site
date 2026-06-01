import { describe, expect, test } from 'vitest';
import { adminSessionSetCookie, signAdminJwt, verifyAdminJwt } from './auth';

describe('admin auth helpers', () => {
    test('emits Strict secure HttpOnly admin session cookies', () => {
        const cookie = adminSessionSetCookie('jwt-value');

        expect(cookie).toContain('portfolio_admin_session=jwt-value');
        expect(cookie).toContain('HttpOnly');
        expect(cookie).toContain('Secure');
        expect(cookie).toContain('SameSite=Strict');
    });

    test('signs and verifies admin JWTs with Web Crypto HMAC', async () => {
        const env = { AUTH_COOKIE_SECRET: 'test-secret' };
        const jwt = await signAdminJwt(env, { githubId: '123', login: 'assentt' });

        await expect(verifyAdminJwt(env, jwt)).resolves.toEqual(expect.objectContaining({
            sub: '123',
            login: 'assentt',
            provider: 'github',
        }));
    });
});
