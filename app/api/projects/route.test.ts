import { describe, vi, beforeEach, afterEach, test, expect, type Mock } from 'vitest';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import {
    listProjects,
    createProject,
    updateProject,
    deleteProject,
    NoFieldsToUpdateError,
    MissingRequiredProjectFieldsError,
    ProjectNotFoundError,
    InvalidProjectFeaturedOrderStateError,
} from '@/lib/server/projects';
import type { Project } from '@/types/db';
import { GET, POST, PATCH, DELETE } from './route';

vi.mock('@opennextjs/cloudflare', () => ({
    getCloudflareContext: vi.fn(),
}));

vi.mock('@/lib/data/projects', () => {
    class ProjectNotFoundError extends Error {
        constructor(message = 'Project not found') {
            super(message);
            this.name = 'ProjectNotFoundError';
        }
    }

    class NoFieldsToUpdateError extends Error {
        constructor(message = 'No fields to update') {
            super(message);
            this.name = 'NoFieldsToUpdateError';
        }
    }

    class MissingRequiredProjectFieldsError extends Error {
        constructor(message = 'Missing required fields') {
            super(message);
            this.name = 'MissingRequiredProjectFieldsError';
        }
    }

    class InvalidProjectFeaturedOrderStateError extends Error {
        constructor(message = 'Projects must either be featured and ordered, or non-featured and unordered') {
            super(message);
            this.name = 'InvalidProjectFeaturedOrderStateError';
        }
    }

    return {
        listProjects: vi.fn(),
        createProject: vi.fn(),
        updateProject: vi.fn(),
        deleteProject: vi.fn(),
        ProjectNotFoundError,
        NoFieldsToUpdateError,
        MissingRequiredProjectFieldsError,
        InvalidProjectFeaturedOrderStateError,
    };
});

const mockDb = {} as D1Database;
const listProjectsMock = listProjects as Mock<typeof listProjects>;
const createProjectMock = createProject as Mock<typeof createProject>;
const updateProjectMock = updateProject as Mock<typeof updateProject>;
const deleteProjectMock = deleteProject as Mock<typeof deleteProject>;

function jsonRequest(method: string, body: unknown): Request {
    return new Request('http://localhost/api/projects', {
        method,
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
    });
}

describe('Projects API route', () => {
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
        test('returns projects from the lib', async () => {
            const projects: Partial<Project>[] = [
                { id: 1, title: 'Portfolio', category: 'Web', featured: true, order_index: 1 },
                { id: 2, title: 'CLI Tool', category: 'Tools', featured: false, order_index: null },
            ];
            listProjectsMock.mockResolvedValue(projects as Project[]);

            const response = await GET();

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual(projects);
            expect(listProjectsMock).toHaveBeenCalledWith(mockDb);
        });

        test('returns 500 when listing projects fails', async () => {
            listProjectsMock.mockRejectedValue(new Error('Database error'));

            const response = await GET();

            expect(response.status).toBe(500);
            expect(await response.json()).toEqual({ error: 'Failed to fetch projects' });
        });
    });

    describe('POST', () => {
        const projectData = {
            title: 'New Portfolio',
            description: 'A new portfolio project',
            image_url: 'http://example.com/image.png',
            link: 'http://example.com',
            category: 'Web Development',
            featured: true,
            order_index: 1,
        };

        test('creates a project through the lib', async () => {
            const newProject = { id: 7, ...projectData, created_at: '2024-01-01T00:00:00.000Z' };
            createProjectMock.mockResolvedValue(newProject);

            const response = await POST(jsonRequest('POST', projectData));

            expect(response.status).toBe(201);
            expect(await response.json()).toEqual(newProject);
            expect(createProjectMock).toHaveBeenCalledWith(mockDb, projectData);
        });

        test('returns 400 for invalid JSON', async () => {
            const response = await POST(new Request('http://localhost/api/projects', {
                method: 'POST',
                body: '{',
            }));

            expect(response.status).toBe(400);
            expect(await response.json()).toEqual({ error: 'Invalid JSON body' });
            expect(createProjectMock).not.toHaveBeenCalled();
        });

        test('maps missing required project fields to 400', async () => {
            createProjectMock.mockRejectedValue(new MissingRequiredProjectFieldsError());

            const response = await POST(jsonRequest('POST', { title: 'Incomplete Project' }));

            expect(response.status).toBe(400);
            expect(await response.json()).toEqual({ error: 'Missing required fields' });
        });

        test('maps invalid featured/order state to 400', async () => {
            createProjectMock.mockRejectedValue(new InvalidProjectFeaturedOrderStateError());

            const response = await POST(jsonRequest('POST', {
                ...projectData,
                featured: false,
                order_index: 1,
            }));

            expect(response.status).toBe(400);
            expect(await response.json()).toEqual({
                error: 'Projects must either be featured and ordered, or non-featured and unordered',
            });
        });

        test('returns 500 when creation fails unexpectedly', async () => {
            createProjectMock.mockRejectedValue(new Error('Database error'));

            const response = await POST(jsonRequest('POST', projectData));

            expect(response.status).toBe(500);
            expect(await response.json()).toEqual({ error: 'Failed to create project' });
        });
    });

    describe('PATCH', () => {
        test('updates a project through the lib', async () => {
            const patch = { id: 1, title: 'Updated E-Commerce Dashboard' };
            updateProjectMock.mockResolvedValue({ changes: 1 });

            const response = await PATCH(jsonRequest('PATCH', patch));

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual({ changes: 1 });
            expect(updateProjectMock).toHaveBeenCalledWith(mockDb, patch.id, patch);
        });

        test('returns 400 when project ID is missing', async () => {
            const response = await PATCH(jsonRequest('PATCH', { title: 'No ID Project' }));

            expect(response.status).toBe(400);
            expect(await response.json()).toEqual({ error: 'Missing project ID' });
            expect(updateProjectMock).not.toHaveBeenCalled();
        });

        test('returns 400 for invalid JSON', async () => {
            const response = await PATCH(new Request('http://localhost/api/projects', {
                method: 'PATCH',
                body: '{',
            }));

            expect(response.status).toBe(400);
            expect(await response.json()).toEqual({ error: 'Invalid JSON body' });
            expect(updateProjectMock).not.toHaveBeenCalled();
        });

        test('maps no fields to update to 400', async () => {
            updateProjectMock.mockRejectedValue(new NoFieldsToUpdateError());

            const response = await PATCH(jsonRequest('PATCH', { id: 1 }));

            expect(response.status).toBe(400);
            expect(await response.json()).toEqual({ error: 'No fields to update' });
        });

        test('maps missing projects to 404', async () => {
            updateProjectMock.mockRejectedValue(new ProjectNotFoundError());

            const response = await PATCH(jsonRequest('PATCH', { id: 999, title: 'Missing' }));

            expect(response.status).toBe(404);
            expect(await response.json()).toEqual({ error: 'Project not found' });
        });

        test('maps invalid featured/order state to 400', async () => {
            updateProjectMock.mockRejectedValue(new InvalidProjectFeaturedOrderStateError());

            const response = await PATCH(jsonRequest('PATCH', { id: 1, featured: false, order_index: 1 }));

            expect(response.status).toBe(400);
            expect(await response.json()).toEqual({
                error: 'Projects must either be featured and ordered, or non-featured and unordered',
            });
        });

        test('returns 500 when update fails unexpectedly', async () => {
            updateProjectMock.mockRejectedValue(new Error('Database error'));

            const response = await PATCH(jsonRequest('PATCH', { id: 1, title: 'Updated' }));

            expect(response.status).toBe(500);
            expect(await response.json()).toEqual({ error: 'Failed to update project' });
        });
    });

    describe('DELETE', () => {
        test('deletes a project through the lib', async () => {
            deleteProjectMock.mockResolvedValue(undefined);

            const response = await DELETE(jsonRequest('DELETE', { id: 1 }));

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual({ message: 'Project deleted successfully' });
            expect(deleteProjectMock).toHaveBeenCalledWith(mockDb, 1);
        });

        test('returns 400 when project ID is missing', async () => {
            const response = await DELETE(jsonRequest('DELETE', {}));

            expect(response.status).toBe(400);
            expect(await response.json()).toEqual({ error: 'Missing project ID' });
            expect(deleteProjectMock).not.toHaveBeenCalled();
        });

        test('returns 400 for invalid JSON', async () => {
            const response = await DELETE(new Request('http://localhost/api/projects', {
                method: 'DELETE',
                body: '{',
            }));

            expect(response.status).toBe(400);
            expect(await response.json()).toEqual({ error: 'Invalid JSON body' });
            expect(deleteProjectMock).not.toHaveBeenCalled();
        });

        test('maps missing projects to 404', async () => {
            deleteProjectMock.mockRejectedValue(new ProjectNotFoundError());

            const response = await DELETE(jsonRequest('DELETE', { id: 999 }));

            expect(response.status).toBe(404);
            expect(await response.json()).toEqual({ error: 'Project not found' });
        });

        test('returns 500 when deletion fails unexpectedly', async () => {
            deleteProjectMock.mockRejectedValue(new Error('Database error'));

            const response = await DELETE(jsonRequest('DELETE', { id: 1 }));

            expect(response.status).toBe(500);
            expect(await response.json()).toEqual({ error: 'Failed to delete project' });
        });
    });
});
