import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';
import { requireAdminUser } from './auth';
import { assertAdminFormMutation, assertAdminMutation } from './admin';

vi.mock('./auth', () => ({
    requireAdminUser: vi.fn(),
}));

const env = {
    SITE_ORIGIN: 'https://example.com',
} as CloudflareEnv;

function request(contentType: string): Request {
    return new Request('https://example.com/api/admin/uploads', {
        method: 'POST',
        headers: {
            Origin: 'https://example.com',
            'Content-Type': contentType,
        },
    });
}

describe('admin mutation guards', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (requireAdminUser as Mock).mockResolvedValue({ authenticated: true });
    });

    test('json admin mutations still require json content type', async () => {
        await expect(assertAdminMutation(request('application/json'), env)).resolves.toBeUndefined();
        await expect(assertAdminMutation(request('multipart/form-data; boundary=form'), env)).rejects.toMatchObject({
            status: 415,
            message: 'Unsupported content type',
        });
    });

    test('form admin mutations accept multipart content type without requiring json', async () => {
        await expect(assertAdminFormMutation(request('multipart/form-data; boundary=form'), env)).resolves.toBeUndefined();
        await expect(assertAdminFormMutation(request('application/json'), env)).rejects.toMatchObject({
            status: 415,
            message: 'Unsupported upload content type',
        });
    });
});
