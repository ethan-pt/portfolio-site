import type { AdminUserDto } from '@/types/api';
import { HttpError } from './http';

export const adminSessionCookie = 'portfolio_admin_session';
export const oauthStateCookie = 'portfolio_oauth_state';

export interface AuthEnv {
    AUTH_COOKIE_SECRET?: string;
    GITHUB_CLIENT_ID?: string;
    GITHUB_CLIENT_SECRET?: string;
    GITHUB_ADMIN_ID?: string;
    GITHUB_ADMIN_LOGIN?: string;
    SITE_ORIGIN?: string;
}

interface AdminJwtPayload {
    sub: string;
    login: string;
    provider: 'github';
    iat: number;
    exp: number;
}

interface GitHubUserResponse {
    id: number;
    login: string;
}

const encoder = new TextEncoder();
const jwtTtlSeconds = 60 * 60 * 8;
const oauthStateTtlSeconds = 60 * 10;

function base64UrlEncodeBytes(bytes: Uint8Array): string {
    let binary = '';
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function base64UrlEncodeString(value: string): string {
    return base64UrlEncodeBytes(encoder.encode(value));
}

function base64UrlDecodeString(value: string): string {
    const padded = value.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }

    return new TextDecoder().decode(bytes);
}

function base64UrlDecodeBytes(value: string): Uint8Array {
    const padded = value.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
    let difference = left.length ^ right.length;
    const length = Math.max(left.length, right.length);

    for (let index = 0; index < length; index += 1) {
        difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
    }

    return difference === 0;
}

async function hmacSha256(secret: string, value: string): Promise<Uint8Array> {
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
    return new Uint8Array(signature);
}

function getRequiredEnv(env: AuthEnv, key: keyof AuthEnv): string {
    const value = env[key];

    if (!value) {
        throw new HttpError(500, `Missing ${key}`);
    }

    return value;
}

function parseCookies(request: Request): Map<string, string> {
    const cookies = new Map<string, string>();
    const cookieHeader = request.headers.get('cookie');

    if (!cookieHeader) {
        return cookies;
    }

    for (const part of cookieHeader.split(';')) {
        const [name, ...rawValue] = part.trim().split('=');
        if (name) {
            cookies.set(name, rawValue.join('='));
        }
    }

    return cookies;
}

function secureCookie(name: string, value: string, maxAgeSeconds: number, sameSite: 'Strict' | 'Lax'): string {
    return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=${sameSite}; Max-Age=${maxAgeSeconds}`;
}

export function clearCookie(name: string): string {
    return `${name}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function oauthStateSetCookie(state: string): string {
    return secureCookie(oauthStateCookie, state, oauthStateTtlSeconds, 'Lax');
}

export function adminSessionSetCookie(jwt: string): string {
    return secureCookie(adminSessionCookie, jwt, jwtTtlSeconds, 'Strict');
}

export function getOAuthStateCookie(request: Request): string | null {
    return parseCookies(request).get(oauthStateCookie) ?? null;
}

export function createOAuthState(): string {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return base64UrlEncodeBytes(bytes);
}

export async function signAdminJwt(env: AuthEnv, user: { githubId: string; login: string }): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const header = base64UrlEncodeString(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = base64UrlEncodeString(JSON.stringify({
        sub: user.githubId,
        login: user.login,
        provider: 'github',
        iat: now,
        exp: now + jwtTtlSeconds,
    } satisfies AdminJwtPayload));
    const signingInput = `${header}.${payload}`;
    const signature = base64UrlEncodeBytes(await hmacSha256(getRequiredEnv(env, 'AUTH_COOKIE_SECRET'), signingInput));

    return `${signingInput}.${signature}`;
}

export async function verifyAdminJwt(env: AuthEnv, jwt: string): Promise<AdminJwtPayload | null> {
    const parts = jwt.split('.');

    if (parts.length !== 3) {
        return null;
    }

    const [header, payload, signature] = parts;
    const signingInput = `${header}.${payload}`;
    const expectedSignature = await hmacSha256(getRequiredEnv(env, 'AUTH_COOKIE_SECRET'), signingInput);
    let actualSignature: Uint8Array;

    try {
        actualSignature = base64UrlDecodeBytes(signature);
    } catch {
        return null;
    }

    if (!equalBytes(actualSignature, expectedSignature)) {
        return null;
    }

    let parsed: AdminJwtPayload;
    try {
        parsed = JSON.parse(base64UrlDecodeString(payload)) as AdminJwtPayload;
    } catch {
        return null;
    }

    if (parsed.provider !== 'github' || !parsed.sub || !parsed.login || parsed.exp < Math.floor(Date.now() / 1000)) {
        return null;
    }

    return parsed;
}

function isAllowedGitHubIdentity(env: AuthEnv, user: { id: string | number; login: string }): boolean {
    const allowedId = env.GITHUB_ADMIN_ID;
    const allowedLogin = env.GITHUB_ADMIN_LOGIN;

    if (allowedId && String(user.id) === allowedId) {
        return true;
    }

    if (allowedLogin && user.login.toLowerCase() === allowedLogin.toLowerCase()) {
        return true;
    }

    return false;
}

export async function getAdminUser(request: Request, env: AuthEnv): Promise<AdminUserDto | null> {
    const jwt = parseCookies(request).get(adminSessionCookie);

    if (!jwt) {
        return null;
    }

    let payload: AdminJwtPayload | null;
    try {
        payload = await verifyAdminJwt(env, jwt);
    } catch (error) {
        if (error instanceof HttpError && error.status === 500) {
            console.error('Failed to verify admin session:', error.message);
            return null;
        }

        throw error;
    }

    if (!payload) {
        return null;
    }

    if (!isAllowedGitHubIdentity(env, { id: payload.sub, login: payload.login })) {
        return null;
    }

    return {
        authenticated: true,
        provider: 'github',
        githubId: payload.sub,
        login: payload.login,
    };
}

export async function requireAdminUser(request: Request, env: AuthEnv): Promise<AdminUserDto> {
    const user = await getAdminUser(request, env);

    if (!user) {
        throw new HttpError(401, 'Authentication required');
    }

    return user;
}

export function assertAllowedGitHubUser(env: AuthEnv, user: { id: number; login: string }): void {
    if (isAllowedGitHubIdentity(env, user)) {
        return;
    }

    throw new HttpError(403, 'GitHub user is not allowed');
}

export function githubAuthorizeUrl(env: AuthEnv, state: string): string {
    const url = new URL('https://github.com/login/oauth/authorize');
    url.searchParams.set('client_id', getRequiredEnv(env, 'GITHUB_CLIENT_ID'));
    url.searchParams.set('redirect_uri', `${getRequiredEnv(env, 'SITE_ORIGIN')}/api/auth/github/callback`);
    url.searchParams.set('scope', 'read:user');
    url.searchParams.set('state', state);
    return url.toString();
}

export async function exchangeGitHubCode(env: AuthEnv, code: string): Promise<string> {
    const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            client_id: getRequiredEnv(env, 'GITHUB_CLIENT_ID'),
            client_secret: getRequiredEnv(env, 'GITHUB_CLIENT_SECRET'),
            code,
            redirect_uri: `${getRequiredEnv(env, 'SITE_ORIGIN')}/api/auth/github/callback`,
        }),
    });

    if (!response.ok) {
        throw new HttpError(502, 'GitHub token exchange failed');
    }

    const body = await response.json() as { access_token?: string; error?: string };

    if (!body.access_token || body.error) {
        throw new HttpError(401, 'GitHub token exchange failed');
    }

    return body.access_token;
}

export async function fetchGitHubUser(accessToken: string): Promise<GitHubUserResponse> {
    const response = await fetch('https://api.github.com/user', {
        headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${accessToken}`,
            'User-Agent': 'portfolio-site-admin-auth',
        },
    });

    if (!response.ok) {
        throw new HttpError(502, 'GitHub user fetch failed');
    }

    const user = await response.json() as Partial<GitHubUserResponse>;

    if (!Number.isInteger(user.id) || typeof user.login !== 'string') {
        throw new HttpError(502, 'Invalid GitHub user response');
    }

    return { id: user.id as number, login: user.login };
}
