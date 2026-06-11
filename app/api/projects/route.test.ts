import { afterEach, beforeEach, describe, expect, test, vi, type Mock } from 'vitest';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { listProjectDtos } from '@/lib/server/projects';
import { GET } from './route';

vi.mock('@opennextjs/cloudflare', () => ({
    getCloudflareContext: vi.fn(),
}));

vi.mock('@/lib/server/projects', () => ({
    listProjectDtos: vi.fn(),
}));

const mockDb = {} as D1Database;
const listProjectDtosMock = listProjectDtos as Mock<typeof listProjectDtos>;

describe('Projects public API route', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        (getCloudflareContext as Mock).mockReturnValue({ env: { DB: mockDb } });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('returns public project DTOs', async () => {
        const projects = [{
            id: 1,
            title: 'Portfolio',
            description: 'Portfolio site',
            image_url: null,
            link: 'https://example.com',
            categories: [{ id: 1, name: 'Web' }],
            featured: true,
            order_index: 1,
            skills: [{ id: 2, name: 'TypeScript', categories: [{ id: 3, name: 'Language' }], featured: true }],
        }];
        listProjectDtosMock.mockResolvedValue(projects);

        const response = await GET();

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual(projects);
        expect(listProjectDtosMock).toHaveBeenCalledWith(mockDb);
    });

    test('returns 500 when listing projects fails', async () => {
        listProjectDtosMock.mockRejectedValue(new Error('Database error'));

        const response = await GET();

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: 'Failed to fetch projects' });
    });
});
