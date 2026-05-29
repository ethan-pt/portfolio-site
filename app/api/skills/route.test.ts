import { describe, vi, beforeEach, afterEach, test, expect, type Mock } from 'vitest';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import {
    listSkills,
    createSkill,
    updateSkill,
    deleteSkill,
    NoFieldsToUpdateError,
    MissingRequiredSkillFieldsError,
    SkillNotFoundError,
} from '@/lib/skills';
import type { Skill } from '@/types/db';
import { GET, POST, PATCH, DELETE } from './route';

vi.mock('@opennextjs/cloudflare', () => ({
    getCloudflareContext: vi.fn(),
}));

vi.mock('@/lib/skills', () => {
    class SkillNotFoundError extends Error {
        constructor(message = 'Skill not found') {
            super(message);
            this.name = 'SkillNotFoundError';
        }
    }

    class NoFieldsToUpdateError extends Error {
        constructor(message = 'No fields to update') {
            super(message);
            this.name = 'NoFieldsToUpdateError';
        }
    }

    class MissingRequiredSkillFieldsError extends Error {
        constructor(message = 'Missing required fields') {
            super(message);
            this.name = 'MissingRequiredSkillFieldsError';
        }
    }

    return {
        listSkills: vi.fn(),
        createSkill: vi.fn(),
        updateSkill: vi.fn(),
        deleteSkill: vi.fn(),
        SkillNotFoundError,
        NoFieldsToUpdateError,
        MissingRequiredSkillFieldsError,
    };
});

const mockDb = {} as D1Database;
const listSkillsMock = listSkills as Mock<typeof listSkills>;
const createSkillMock = createSkill as Mock<typeof createSkill>;
const updateSkillMock = updateSkill as Mock<typeof updateSkill>;
const deleteSkillMock = deleteSkill as Mock<typeof deleteSkill>;

function jsonRequest(method: string, body: unknown): Request {
    return new Request('http://localhost/api/skills', {
        method,
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
    });
}

describe('Skills API route', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => undefined);

        (getCloudflareContext as Mock).mockReturnValue({
            env: { DB: mockDb },
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('GET', () => {
        test('returns skills from the lib', async () => {
            const skills: Partial<Skill>[] = [
                { id: 1, name: 'React', category: 'Frontend', featured: true },
                { id: 2, name: 'Node.js', category: 'Backend', featured: false },
            ];
            listSkillsMock.mockResolvedValue(skills as Skill[]);

            const response = await GET();

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual(skills);
            expect(listSkillsMock).toHaveBeenCalledWith(mockDb);
        });

        test('returns 500 when listing skills fails', async () => {
            listSkillsMock.mockRejectedValue(new Error('Database error'));

            const response = await GET();

            expect(response.status).toBe(500);
            expect(await response.json()).toEqual({ error: 'Failed to fetch skills' });
        });
    });

    describe('POST', () => {
        const skillData = {
            name: 'React',
            category: 'Frontend',
            featured: true,
        };

        test('creates a skill through the lib', async () => {
            const newSkill = { id: 7, ...skillData, created_at: '2024-01-01T00:00:00.000Z' };
            createSkillMock.mockResolvedValue(newSkill);

            const response = await POST(jsonRequest('POST', skillData));

            expect(response.status).toBe(201);
            expect(await response.json()).toEqual(newSkill);
            expect(createSkillMock).toHaveBeenCalledWith(mockDb, skillData);
        });

        test('returns 400 for invalid JSON', async () => {
            const response = await POST(new Request('http://localhost/api/skills', {
                method: 'POST',
                body: '{',
            }));

            expect(response.status).toBe(400);
            expect(await response.json()).toEqual({ error: 'Invalid JSON body' });
            expect(createSkillMock).not.toHaveBeenCalled();
        });

        test('maps missing required skill fields to 400', async () => {
            createSkillMock.mockRejectedValue(new MissingRequiredSkillFieldsError());

            const response = await POST(jsonRequest('POST', { name: 'Incomplete Skill' }));

            expect(response.status).toBe(400);
            expect(await response.json()).toEqual({ error: 'Missing required fields' });
        });

        test('returns 500 when creation fails unexpectedly', async () => {
            createSkillMock.mockRejectedValue(new Error('Database error'));

            const response = await POST(jsonRequest('POST', skillData));

            expect(response.status).toBe(500);
            expect(await response.json()).toEqual({ error: 'Failed to create skill' });
        });
    });

    describe('PATCH', () => {
        test('updates a skill through the lib', async () => {
            const patch = { id: 1, name: 'React Updated' };
            updateSkillMock.mockResolvedValue({ changes: 1 });

            const response = await PATCH(jsonRequest('PATCH', patch));

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual({ changes: 1 });
            expect(updateSkillMock).toHaveBeenCalledWith(mockDb, patch.id, patch);
        });

        test('returns 400 when skill ID is missing', async () => {
            const response = await PATCH(jsonRequest('PATCH', { name: 'No ID Skill' }));

            expect(response.status).toBe(400);
            expect(await response.json()).toEqual({ error: 'Missing skill ID' });
            expect(updateSkillMock).not.toHaveBeenCalled();
        });

        test('returns 400 for invalid JSON', async () => {
            const response = await PATCH(new Request('http://localhost/api/skills', {
                method: 'PATCH',
                body: '{',
            }));

            expect(response.status).toBe(400);
            expect(await response.json()).toEqual({ error: 'Invalid JSON body' });
            expect(updateSkillMock).not.toHaveBeenCalled();
        });

        test('maps no fields to update to 400', async () => {
            updateSkillMock.mockRejectedValue(new NoFieldsToUpdateError());

            const response = await PATCH(jsonRequest('PATCH', { id: 1 }));

            expect(response.status).toBe(400);
            expect(await response.json()).toEqual({ error: 'No fields to update' });
        });

        test('maps missing skills to 404', async () => {
            updateSkillMock.mockRejectedValue(new SkillNotFoundError());

            const response = await PATCH(jsonRequest('PATCH', { id: 999, name: 'Missing' }));

            expect(response.status).toBe(404);
            expect(await response.json()).toEqual({ error: 'Skill not found' });
        });

        test('returns 500 when update fails unexpectedly', async () => {
            updateSkillMock.mockRejectedValue(new Error('Database error'));

            const response = await PATCH(jsonRequest('PATCH', { id: 1, name: 'Updated' }));

            expect(response.status).toBe(500);
            expect(await response.json()).toEqual({ error: 'Failed to update skill' });
        });
    });

    describe('DELETE', () => {
        test('deletes a skill through the lib', async () => {
            deleteSkillMock.mockResolvedValue(undefined);

            const response = await DELETE(jsonRequest('DELETE', { id: 1 }));

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual({ message: 'Skill deleted successfully' });
            expect(deleteSkillMock).toHaveBeenCalledWith(mockDb, 1);
        });

        test('returns 400 when skill ID is missing', async () => {
            const response = await DELETE(jsonRequest('DELETE', {}));

            expect(response.status).toBe(400);
            expect(await response.json()).toEqual({ error: 'Missing skill ID' });
            expect(deleteSkillMock).not.toHaveBeenCalled();
        });

        test('returns 400 for invalid JSON', async () => {
            const response = await DELETE(new Request('http://localhost/api/skills', {
                method: 'DELETE',
                body: '{',
            }));

            expect(response.status).toBe(400);
            expect(await response.json()).toEqual({ error: 'Invalid JSON body' });
            expect(deleteSkillMock).not.toHaveBeenCalled();
        });

        test('maps missing skills to 404', async () => {
            deleteSkillMock.mockRejectedValue(new SkillNotFoundError());

            const response = await DELETE(jsonRequest('DELETE', { id: 999 }));

            expect(response.status).toBe(404);
            expect(await response.json()).toEqual({ error: 'Skill not found' });
        });

        test('returns 500 when deletion fails unexpectedly', async () => {
            deleteSkillMock.mockRejectedValue(new Error('Database error'));

            const response = await DELETE(jsonRequest('DELETE', { id: 1 }));

            expect(response.status).toBe(500);
            expect(await response.json()).toEqual({ error: 'Failed to delete skill' });
        });
    });
});
