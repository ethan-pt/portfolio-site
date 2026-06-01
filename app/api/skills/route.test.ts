import { afterEach, beforeEach, describe, expect, test, vi, type Mock } from 'vitest';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { listSkillDtos } from '@/lib/server/skills';
import { GET } from './route';

vi.mock('@opennextjs/cloudflare', () => ({
    getCloudflareContext: vi.fn(),
}));

vi.mock('@/lib/server/skills', () => ({
    listSkillDtos: vi.fn(),
}));

const mockDb = {} as D1Database;
const listSkillDtosMock = listSkillDtos as Mock<typeof listSkillDtos>;

describe('Skills public API route', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        (getCloudflareContext as Mock).mockReturnValue({ env: { DB: mockDb } });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('returns public skill DTOs', async () => {
        const skills = [{ id: 1, name: 'React', category: 'Frontend', featured: true }];
        listSkillDtosMock.mockResolvedValue(skills);

        const response = await GET();

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual(skills);
        expect(listSkillDtosMock).toHaveBeenCalledWith(mockDb);
    });

    test('returns 500 when listing skills fails', async () => {
        listSkillDtosMock.mockRejectedValue(new Error('Database error'));

        const response = await GET();

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: 'Failed to fetch skills' });
    });
});
