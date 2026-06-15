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

    test('accepts jpg alias and missing content type from file names', async () => {
        const jpgResponse = await POST(uploadRequest(new File(['image'], 'photo.jpg', { type: 'image/jpg' })));
        const pngResponse = await POST(uploadRequest(new File(['image'], 'diagram.png', { type: '' })));
        const jpgBody = await jpgResponse.json() as { key: string };
        const pngBody = await pngResponse.json() as { key: string };

        expect(jpgResponse.status).toBe(201);
        expect(pngResponse.status).toBe(201);
        expect(jpgBody.key).toMatch(/^projects\/.+\.jpg$/);
        expect(pngBody.key).toMatch(/^projects\/.+\.png$/);
        expect(bucket.put).toHaveBeenNthCalledWith(1, jpgBody.key, expect.any(ArrayBuffer), {
            httpMetadata: { contentType: 'image/jpeg' },
        });
        expect(bucket.put).toHaveBeenNthCalledWith(2, pngBody.key, expect.any(ArrayBuffer), {
            httpMetadata: { contentType: 'image/png' },
        });
    });

    test('rejects unsupported files before writing to R2', async () => {
        const response = await POST(uploadRequest(new File(['text'], 'note.txt', { type: 'text/plain' })));

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            error: 'Unsupported image type',
            code: 'UPLOAD_VALIDATION_FAILED',
            details: {
                fileName: 'note.txt',
                contentType: 'text/plain',
                normalizedContentType: 'text/plain',
                size: 4,
                stage: 'validate',
            },
        });
        expect(bucket.put).not.toHaveBeenCalled();
    });

    test('returns diagnostics when R2 storage fails', async () => {
        bucket.put.mockRejectedValueOnce(new Error('R2 unavailable'));

        const response = await POST(uploadRequest(new File(['image'], 'image.png', { type: 'image/png' })));
        const body = await response.json();

        expect(response.status).toBe(500);
        expect(body).toMatchObject({
            error: 'Failed to upload image',
            code: 'UPLOAD_FAILED',
            details: {
                fileName: 'image.png',
                contentType: 'image/png',
                normalizedContentType: 'image/png',
                size: 5,
                stage: 'r2_put',
            },
        });
    });
});
