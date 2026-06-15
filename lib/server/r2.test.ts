import { describe, expect, test, vi } from 'vitest';
import { createSignedR2PutUrl, deleteManagedR2Object, normalizeUploadContentType, verifyManagedR2Object } from './r2';

const env = {
    R2_ACCOUNT_ID: 'account-id',
    R2_ACCESS_KEY_ID: 'access-key',
    R2_SECRET_ACCESS_KEY: 'secret-key',
    R2_BUCKET_NAME: 'portfolio-images',
    R2_PUBLIC_BASE_URL: 'https://cdn.example.com',
};

describe('R2 helpers', () => {
    test('creates Worker-compatible signed R2 PUT upload instructions', async () => {
        const upload = await createSignedR2PutUrl(env, 'image/webp', 1234);

        expect(upload.method).toBe('PUT');
        expect(upload.uploadUrl).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
        expect(upload.uploadUrl).toContain('X-Amz-Signature=');
        expect(upload.key).toMatch(/^projects\/.+\.webp$/);
        expect(upload.publicUrl).toBe(`https://cdn.example.com/${upload.key}`);
        expect(upload.headers).toEqual({ 'Content-Type': 'image/webp' });
    });

    test('normalizes upload content types', () => {
        expect(normalizeUploadContentType('image/jpg')).toBe('image/jpeg');
        expect(normalizeUploadContentType('', 'photo.JPG')).toBe('image/jpeg');
        expect(normalizeUploadContentType('application/octet-stream', 'photo.png')).toBe('image/png');
    });

    test('verifies and deletes only managed project image keys', async () => {
        const bucket = {
            head: vi.fn().mockResolvedValue({
                key: 'projects/image.webp',
                size: 1234,
                httpMetadata: { contentType: 'image/webp' },
            }),
            delete: vi.fn().mockResolvedValue(undefined),
        } as unknown as R2Bucket;

        await expect(verifyManagedR2Object(bucket, 'projects/image.webp')).resolves.toBeUndefined();
        await deleteManagedR2Object(bucket, 'projects/image.webp');
        await deleteManagedR2Object(bucket, 'external/image.webp');

        expect(bucket.head).toHaveBeenCalledWith('projects/image.webp');
        expect(bucket.delete).toHaveBeenCalledTimes(1);
        expect(bucket.delete).toHaveBeenCalledWith('projects/image.webp');
    });
});
