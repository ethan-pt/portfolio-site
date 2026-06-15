import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { assertAdminMutation } from '@/lib/server/admin';
import { POST } from './route';

vi.mock('@opennextjs/cloudflare', () => ({
    getCloudflareContext: vi.fn(),
}));

vi.mock('@/lib/server/admin', () => ({
    assertAdminMutation: vi.fn(),
}));

const bucket = {
    put: vi.fn(),
};

const env = {
    BUCKET: bucket,
    R2_PUBLIC_BASE_URL: 'https://cdn.example.com',
    SITE_ORIGIN: 'https://example.com',
} as unknown as CloudflareEnv;

function uploadRequest(file: File): Request {
    const formData = new FormData();
    formData.set('file', file);
    const request = new Request('https://example.com/api/admin/uploads', {
        method: 'POST',
        headers: { Origin: 'https://example.com' },
    });

    Object.defineProperty(request, 'formData', {
        value: vi.fn().mockResolvedValue(formData),
    });

    return request;
}

describe('Admin uploads API route', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        (getCloudflareContext as Mock).mockReturnValue({ env });
        (assertAdminMutation as Mock).mockResolvedValue(undefined);
        bucket.put.mockResolvedValue(undefined);
    });

    test('uploads an image through the R2 binding', async () => {
        const response = await POST(uploadRequest(new File(['image'], 'image.webp', { type: 'image/webp' })));
        const body = await response.json() as { key: string; publicUrl: string };

        expect(response.status).toBe(201);
        expect(body.key).toMatch(/^projects\/.+\.webp$/);
        expect(body.publicUrl).toBe(`https://cdn.example.com/${body.key}`);
        expect(bucket.put).toHaveBeenCalledWith(body.key, expect.any(ArrayBuffer), {
            httpMetadata: { contentType: 'image/webp' },
        });
    });

    test('rejects unsupported files before writing to R2', async () => {
        const response = await POST(uploadRequest(new File(['text'], 'note.txt', { type: 'text/plain' })));

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: 'Unsupported image type' });
        expect(bucket.put).not.toHaveBeenCalled();
    });
});
