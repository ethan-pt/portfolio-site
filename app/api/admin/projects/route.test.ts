import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { assertAdminMutation } from '@/lib/server/admin';
import { HttpError } from '@/lib/server/http';
import { createProject, deleteProject, getProjectById, listProjectImages, updateProject } from '@/lib/server/projects';
import { deleteManagedR2Object } from '@/lib/server/r2';
import { DELETE, PATCH, POST } from './route';

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
        createProject: vi.fn(),
        createProjectWithSkills: vi.fn(),
        updateProject: vi.fn(),
        updateProjectWithSkills: vi.fn(),
        deleteProject: vi.fn(),
        getProjectById: vi.fn(),
        listProjectImages: vi.fn(),
        replaceProjectSkills: vi.fn(),
    };
});

vi.mock('@/lib/server/r2', async () => {
    const actual = await vi.importActual<typeof import('@/lib/server/r2')>('@/lib/server/r2');
    return {
        ...actual,
        deleteManagedR2Object: vi.fn(),
    };
});

const mockDb = {} as D1Database;
const mockBucket = {} as R2Bucket;
const env = {
    DB: mockDb,
    BUCKET: mockBucket,
    SITE_ORIGIN: 'https://example.com',
    R2_PUBLIC_BASE_URL: 'https://cdn.example.com',
} as CloudflareEnv;

function jsonRequest(method: string, body: unknown): Request {
    return new Request('https://example.com/api/admin/projects', {
        method,
        headers: {
            'Content-Type': 'application/json',
            Origin: 'https://example.com',
        },
        body: JSON.stringify(body),
    });
}

describe('Admin projects API route', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        (getCloudflareContext as Mock).mockReturnValue({ env });
        (assertAdminMutation as Mock).mockResolvedValue(undefined);
        (listProjectImages as Mock).mockResolvedValue([]);
    });

    test('rejects unauthorized writes before creating a project', async () => {
        (assertAdminMutation as Mock).mockRejectedValue(new HttpError(401, 'Authentication required'));

        const response = await POST(jsonRequest('POST', {}));

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: 'Authentication required' });
        expect(createProject).not.toHaveBeenCalled();
    });

    test('creates a project and derives managed R2 public URL from image_key', async () => {
        const createdProject = {
            id: 7,
            title: 'Portfolio',
            description: 'Site',
            image_url: 'https://cdn.example.com/projects/image.webp',
            image_key: 'projects/image.webp',
            link: 'https://example.com',
            category_ids: [1],
            featured: true,
            order_index: 1,
            created_at: '2026-01-01T00:00:00.000Z',
        };
        (createProject as Mock).mockResolvedValue(createdProject);

        const response = await POST(jsonRequest('POST', {
            title: 'Portfolio',
            description: 'Site',
            image_key: 'projects/image.webp',
            link: 'https://example.com',
            category_ids: [1],
            featured: true,
            order_index: 1,
        }));

        expect(response.status).toBe(201);
        expect(createProject).toHaveBeenCalledWith(mockDb, expect.objectContaining({
            image_key: 'projects/image.webp',
            image_url: 'https://cdn.example.com/projects/image.webp',
        }), [1], null);
    });

    test('deletes the owned R2 object before deleting the project row', async () => {
        (getProjectById as Mock).mockResolvedValue({ id: 1, image_key: 'projects/image.webp' });
        (deleteManagedR2Object as Mock).mockResolvedValue(undefined);
        (deleteProject as Mock).mockResolvedValue(undefined);

        const response = await DELETE(jsonRequest('DELETE', { id: 1 }));

        expect(response.status).toBe(200);
        expect(deleteManagedR2Object).toHaveBeenCalledWith(mockBucket, 'projects/image.webp');
        expect(deleteProject).toHaveBeenCalledWith(mockDb, 1);
    });

    test('replacing a managed image deletes the previous R2 object after update', async () => {
        (getProjectById as Mock).mockResolvedValue({ id: 1, image_key: 'projects/old.webp' });
        (updateProject as Mock).mockResolvedValue({ id: 1, image_key: 'projects/new.webp' });
        (deleteManagedR2Object as Mock).mockResolvedValue(undefined);

        const response = await PATCH(jsonRequest('PATCH', {
            id: 1,
            image_key: 'projects/new.webp',
        }));

        expect(response.status).toBe(200);
        expect(deleteManagedR2Object).toHaveBeenCalledWith(mockBucket, 'projects/old.webp');
    });
});
