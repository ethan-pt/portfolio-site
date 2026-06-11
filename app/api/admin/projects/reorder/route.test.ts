import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { assertAdminMutation } from '@/lib/server/admin';
import { HttpError } from '@/lib/server/http';
import { InvalidProjectReorderError, ProjectConflictError, reorderFeaturedProjects } from '@/lib/server/projects';
import { PATCH } from './route';

vi.mock('@opennextjs/cloudflare', () => ({
    getCloudflareContext: vi.fn(),
}));

vi.mock('@/lib/server/admin', () => ({
    assertAdminMutation: vi.fn(),
}));

vi.mock('@/lib/server/projects', async () => {
    const actual = await vi.importActual<typeof import('@/lib/server/projects')>('@/lib/server/projects');
    return {
        ...actual,
        reorderFeaturedProjects: vi.fn(),
    };
});

const mockDb = {} as D1Database;
const env = {
    DB: mockDb,
    SITE_ORIGIN: 'https://example.com',
} as CloudflareEnv;

function jsonRequest(body: unknown): Request {
    return new Request('https://example.com/api/admin/projects/reorder', {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Origin: 'https://example.com',
        },
        body: JSON.stringify(body),
    });
}

describe('Admin project reorder API route', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        (getCloudflareContext as Mock).mockReturnValue({ env });
        (assertAdminMutation as Mock).mockResolvedValue(undefined);
        (reorderFeaturedProjects as Mock).mockResolvedValue(undefined);
    });

    test('rejects unauthorized reorder requests', async () => {
        (assertAdminMutation as Mock).mockRejectedValue(new HttpError(401, 'Authentication required'));

        const response = await PATCH(jsonRequest({ project_ids: [1, 2] }));

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: 'Authentication required' });
        expect(reorderFeaturedProjects).not.toHaveBeenCalled();
    });

    test('reorders featured projects with submitted IDs', async () => {
        const response = await PATCH(jsonRequest({ project_ids: [3, 1, 2] }));

        expect(response.status).toBe(200);
        expect(reorderFeaturedProjects).toHaveBeenCalledWith(mockDb, [3, 1, 2]);
    });

    test('rejects invalid request shape', async () => {
        const response = await PATCH(jsonRequest({ project_ids: '1,2' }));

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: 'Invalid project IDs' });
    });

    test('maps stale featured order conflicts to 409', async () => {
        (reorderFeaturedProjects as Mock).mockRejectedValue(new ProjectConflictError('Featured project order is stale. Refresh and try again.'));

        const response = await PATCH(jsonRequest({ project_ids: [1, 2] }));

        expect(response.status).toBe(409);
        expect(await response.json()).toEqual({ error: 'Featured project order is stale. Refresh and try again.' });
    });

    test('maps helper validation errors to 400', async () => {
        (reorderFeaturedProjects as Mock).mockRejectedValue(new InvalidProjectReorderError('Duplicate project IDs'));

        const response = await PATCH(jsonRequest({ project_ids: [1, 1] }));

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: 'Duplicate project IDs' });
    });
});
