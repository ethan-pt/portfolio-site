import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { GET } from './route';

vi.mock('@opennextjs/cloudflare', () => ({
    getCloudflareContext: vi.fn(),
}));

const bucket = {
    get: vi.fn(),
};

const env = {
    BUCKET: bucket,
} as unknown as CloudflareEnv;

function r2Body(value: string): ReadableStream<Uint8Array> {
    return new ReadableStream({
        start(controller) {
            controller.enqueue(new TextEncoder().encode(value));
            controller.close();
        },
    });
}

function r2Object(body = 'image') {
    return {
        body: r2Body(body),
        httpEtag: '"local-etag"',
        httpMetadata: { contentType: 'image/webp' },
    };
}

describe('Local R2 API route', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (getCloudflareContext as Mock).mockReturnValue({ env });
    });

    test('serves managed project images from the local R2 binding on localhost', async () => {
        bucket.get.mockResolvedValue(r2Object('local-image'));

        const response = await GET(new Request('http://localhost:3000/api/local-r2/projects/image.webp'));

        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toBe('image/webp');
        expect(response.headers.get('cache-control')).toBe('no-store');
        expect(await response.text()).toBe('local-image');
        expect(bucket.get).toHaveBeenCalledWith('projects/image.webp');
    });

    test('serves local R2 objects on private network hosts', async () => {
        bucket.get.mockResolvedValue(r2Object());

        const response = await GET(new Request('http://10.0.0.182:3000/api/local-r2/projects/image.webp'));

        expect(response.status).toBe(200);
        expect(bucket.get).toHaveBeenCalledWith('projects/image.webp');
    });

    test('returns 404 without reading R2 for public hosts', async () => {
        const response = await GET(new Request('https://ethan-pt.dev/api/local-r2/projects/image.webp'));

        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({ error: 'Image not found' });
        expect(bucket.get).not.toHaveBeenCalled();
    });

    test('returns 404 for unmanaged or missing objects', async () => {
        const unmanagedResponse = await GET(new Request('http://localhost:3000/api/local-r2/avatars/image.webp'));
        bucket.get.mockResolvedValueOnce(null);
        const missingResponse = await GET(new Request('http://localhost:3000/api/local-r2/projects/missing.webp'));

        expect(unmanagedResponse.status).toBe(404);
        expect(missingResponse.status).toBe(404);
        expect(bucket.get).toHaveBeenCalledTimes(1);
        expect(bucket.get).toHaveBeenCalledWith('projects/missing.webp');
    });
});
