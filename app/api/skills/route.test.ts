import { describe, vi, beforeEach, Mock, test, expect } from 'vitest';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { Skill } from '@/types/db';
import { GET, POST, PATCH, DELETE } from './route';
import { mock } from 'node:test';


vi.mock('@opennextjs/cloudflare', () => ({
    getCloudflareContext: vi.fn(),
}));

describe('Skills API', () => {
    const mockDb = {
        prepare: vi.fn().mockReturnValue({
            all: vi.fn(),
            run: vi.fn(),
            get: vi.fn(),
        }),
    };

    beforeEach(() => {
        vi.clearAllMocks();

        (getCloudflareContext as Mock).mockReturnValue({
            env: { DB: mockDb },
        });
    });

    describe('GET method', () => {
        test('returns all skills and status 200', async () => {
            const mockResults = [
                { id: 1, name: 'React', category: 'Frontend', featured: true, created_at: '2023-01-01T00:00:00Z' },
                { id: 2, name: 'Node.js', category: 'Backend', featured: false, created_at: '2023-01-02T00:00:00Z' },
            ];
            mockDb.prepare().all.mockResolvedValue({ results: mockResults });
            const response = await GET(new Request('http://localhost/skills'));

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual(mockResults);
        });

        test('returns empty array when no skills exist', async () => {
            mockDb.prepare().all.mockResolvedValue({ results: [] });

            const response = await GET(new Request('http://localhost/skills'));

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual([]);
        });

        test('ordering logic is correct', async () => {
            const mockResults = [
                { id: 1, name: 'React', category: 'Frontend', featured: true, created_at: '2023-01-01T00:00:00Z' },
                { id: 2, name: 'Node.js', category: 'Backend', featured: false, created_at: '2023-01-02T00:00:00Z' },
                { id: 3, name: 'Vue', category: 'Frontend', featured: true, created_at: '2023-01-03T00:00:00Z' },
            ];
            mockDb.prepare().all.mockResolvedValue({ results: mockResults });

            const response = await GET(new Request('http://localhost/skills'));

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data[0].featured).toBe(true);
        });

        test('handles database errors gracefully', async () => {
            mockDb.prepare().all.mockRejectedValue(new Error('Database error'));
            const response = await GET(new Request('http://localhost/skills'));

            expect(response.status).toBe(500);
            expect(await response.json()).toEqual({ error: 'Failed to fetch skills' });
        });
    });

    describe('POST method', () => {
        test('creates a new skill and returns it with status 201', async () => {
            const newSkill = { id: 1, name: 'React', category: 'Frontend', featured: true };
            mockDb.prepare().run.mockResolvedValue({ lastRowId: newSkill.id });

            const requestBody = { name: 'React', category: 'Frontend', featured: true };
            const response = await POST(new Request('http://localhost/skills', {
                method: 'POST',
                body: JSON.stringify(requestBody),
                headers: { 'Content-Type': 'application/json' },
            }));

            const expectedSkill = { ...newSkill, created_at: expect.any(String) };

            expect(response.status).toBe(201);
            expect(await response.json()).toEqual(expectedSkill);
        });

        test('returns 400 if required fields are missing', async () => {
            const response = await POST(new Request('http://localhost/skills', {
                method: 'POST',
                body: JSON.stringify({ name: 'React' }), // Missing category
                headers: { 'Content-Type': 'application/json' },
            }));

            expect(response.status).toBe(400);
            expect(await response.json()).toEqual({ error: 'Missing required fields' });
        });

        test('handles database errors gracefully', async () => {
            mockDb.prepare().run.mockRejectedValue(new Error('Database error'));
            const requestBody = { name: 'React', category: 'Frontend', featured: true };
            const response = await POST(new Request('http://localhost/skills', {
                method: 'POST',
                body: JSON.stringify(requestBody),
                headers: { 'Content-Type': 'application/json' },
            }));

            expect(response.status).toBe(500);
            expect(await response.json()).toEqual({ error: 'Failed to create skill' });
        });
    });

    describe('PATCH method', () => {
        const existingSkill: Skill = {
            id: 1,
            name: 'React',
            category: 'Frontend',
            featured: true,
            created_at: '2023-01-01T00:00:00Z',
        }

        test('updates an existing skill and returns it with status 200', async () => {
            mockDb.prepare().get.mockResolvedValue(existingSkill);
            mockDb.prepare().run.mockResolvedValue({ changes: 1 });

            const requestBody = { id: existingSkill.id, name: 'React Updated' };
            const response = await PATCH(new Request('http://localhost/skills', {
                method: 'PATCH',
                body: JSON.stringify(requestBody),
                headers: { 'Content-Type': 'application/json' },
            }));

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual({ changes: 1 });
        });

        test('returns 400 if skill ID is missing', async () => {
            const response = await PATCH(new Request('http://localhost/skills', {
                method: 'PATCH',
                body: JSON.stringify({ name: 'React Updated' }), // Missing ID
                headers: { 'Content-Type': 'application/json' },
            }));

            expect(response.status).toBe(400);
            expect(await response.json()).toEqual({ error: 'Missing skill ID' });
        });

        test('returns 404 if skill does not exist', async () => {
            mockDb.prepare().get.mockResolvedValue(undefined);

            const requestBody = { id: 999, name: 'Nonexistent Skill' };
            const response = await PATCH(new Request('http://localhost/skills', {
                method: 'PATCH',
                body: JSON.stringify(requestBody),
                headers: { 'Content-Type': 'application/json' },
            }));

            expect(response.status).toBe(404);
            expect(await response.json()).toEqual({ error: 'Skill not found' });
        });

        test('returns 400 if no fields to update are provided', async () => {
            mockDb.prepare().get.mockResolvedValue(existingSkill);

            const requestBody = { id: existingSkill.id }; // No fields to update
            const response = await PATCH(new Request('http://localhost/skills', {
                method: 'PATCH',
                body: JSON.stringify(requestBody),
                headers: { 'Content-Type': 'application/json' },
            }));

            expect(response.status).toBe(400);
            expect(await response.json()).toEqual({ error: 'No fields to update' });
        });

        test('handles database errors gracefully', async () => {
            mockDb.prepare().get.mockResolvedValue(existingSkill);
            mockDb.prepare().run.mockRejectedValue(new Error('Database error'));

            const requestBody = { id: existingSkill.id, name: 'React Updated' };
            const response = await PATCH(new Request('http://localhost/skills', {
                method: 'PATCH',
                body: JSON.stringify(requestBody),
                headers: { 'Content-Type': 'application/json' },
            }));

            expect(response.status).toBe(500);
            expect(await response.json()).toEqual({ error: 'Failed to update skill' });
        });
    });

    describe('DELETE method', () => {
        const existingSkill: Skill = {
            id: 1,
            name: 'React',
            category: 'Frontend',
            featured: true,
            created_at: '2023-01-01T00:00:00Z',
        }

        test('deletes an existing skill and returns status 200', async () => {
            mockDb.prepare().get.mockResolvedValue(existingSkill);
            mockDb.prepare().run.mockResolvedValue({ changes: 1 });

            const response = await DELETE(new Request('http://localhost/skills', {
                method: 'DELETE',
                body: JSON.stringify({ id: existingSkill.id }),
                headers: { 'Content-Type': 'application/json' },
            }));

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual({ message: 'Skill deleted successfully' });
        });

        test('returns 400 if skill ID is missing', async () => {
            const response = await DELETE(new Request('http://localhost/skills', {
                method: 'DELETE',
                body: JSON.stringify({}), // Missing ID
                headers: { 'Content-Type': 'application/json' },
            }));

            expect(response.status).toBe(400);
            expect(await response.json()).toEqual({ error: 'Missing skill ID' });
        });

        test('returns 404 if skill does not exist', async () => {
            mockDb.prepare().run.mockResolvedValue({ changes: 0 }); // Simulate no rows deleted
            const response = await DELETE(new Request('http://localhost/skills', {
                method: 'DELETE',
                body: JSON.stringify({ id: 999 }), // Nonexistent ID
                headers: { 'Content-Type': 'application/json' },
            }));

            expect(response.status).toBe(404);
            expect(await response.json()).toEqual({ error: 'Skill not found' });
        });

        test('handles database errors gracefully', async () => {
            mockDb.prepare().run.mockRejectedValue(new Error('Database error'));

            const response = await DELETE(new Request('http://localhost/skills', {
                method: 'DELETE',
                body: JSON.stringify({ id: existingSkill.id }),
                headers: { 'Content-Type': 'application/json' },
            }));

            expect(response.status).toBe(500);
            expect(await response.json()).toEqual({ error: 'Failed to delete skill' });
        });
    });
});
