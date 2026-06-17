import { describe, expect, test } from 'vitest';
import {
    adminSessionCookie,
    adminSessionSetCookie,
    getAdminUser,
    requireAdminUser,
    signAdminJwt,
    verifyAdminJwt,
} from './auth';

function requestWithSession(jwt: string): Request {
    return new Request('https://example.com/admin', {
        headers: {
            Cookie: `${adminSessionCookie}=${jwt}`,
        },
    });
}

describe('admin auth helpers', () => {
    test('emits Strict secure HttpOnly admin session cookies by default', () => {
        const cookie = adminSessionSetCookie('jwt-value');

        expect(cookie).toContain('portfolio_admin_session=jwt-value');
        expect(cookie).toContain('HttpOnly');
        expect(cookie).toContain('Secure');
        expect(cookie).toContain('SameSite=Strict');
    });

    test('omits Secure for local HTTP admin cookies', () => {
        const localIpCookie = adminSessionSetCookie('jwt-value', { SITE_ORIGIN: 'http://10.0.0.182:3001' });
        const localHostCookie = adminSessionSetCookie('jwt-value', { SITE_ORIGIN: 'http://localhost:3001' });
        const productionCookie = adminSessionSetCookie('jwt-value', { SITE_ORIGIN: 'https://ethan-pt.dev' });

        expect(localIpCookie).not.toContain('Secure');
        expect(localHostCookie).not.toContain('Secure');
        expect(productionCookie).toContain('Secure');
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

    test('rejects tampered admin JWT signatures', async () => {
        const env = { AUTH_COOKIE_SECRET: 'test-secret' };
        const jwt = await signAdminJwt(env, { githubId: '123', login: 'assentt' });
        const tamperedJwt = jwt.replace(/\.[^.]+$/, '.invalid');

        await expect(verifyAdminJwt(env, tamperedJwt)).resolves.toBeNull();
    });

    test('returns an admin user only when the signed session matches the current allowlist', async () => {
        const env = {
            AUTH_COOKIE_SECRET: 'test-secret',
            GITHUB_ADMIN_ID: '123',
        };
        const jwt = await signAdminJwt(env, { githubId: '123', login: 'assentt' });

        await expect(getAdminUser(requestWithSession(jwt), env)).resolves.toEqual({
            authenticated: true,
            provider: 'github',
            githubId: '123',
            login: 'assentt',
        });
    });

    test('rejects a valid signed session when the GitHub identity is no longer allowed', async () => {
        const signingEnv = {
            AUTH_COOKIE_SECRET: 'test-secret',
            GITHUB_ADMIN_ID: '123',
        };
        const currentEnv = {
            AUTH_COOKIE_SECRET: 'test-secret',
            GITHUB_ADMIN_ID: '456',
        };
        const jwt = await signAdminJwt(signingEnv, { githubId: '123', login: 'assentt' });
        const request = requestWithSession(jwt);

        await expect(getAdminUser(request, currentEnv)).resolves.toBeNull();
        await expect(requireAdminUser(request, currentEnv)).rejects.toMatchObject({
            status: 401,
            message: 'Authentication required',
        });
    });
});
