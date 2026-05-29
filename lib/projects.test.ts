import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { Project } from '@/types/db';
import {
    listProjects,
    createProject,
    updateProject,
    deleteProject,
    NoFieldsToUpdateError,
    MissingRequiredProjectFieldsError,
    ProjectNotFoundError,
    InvalidProjectFeaturedOrderStateError,
} from './projects';

function createMockDb() {
    const statement = {
        bind: vi.fn(),
        all: vi.fn(),
        first: vi.fn(),
        run: vi.fn(),
    };

    statement.bind.mockReturnValue(statement);

    const db = {
        prepare: vi.fn(() => statement),
    } as unknown as D1Database;

    return { db, statement, prepare: db.prepare as ReturnType<typeof vi.fn> };
}

describe('project data access', () => {
    let mock: ReturnType<typeof createMockDb>;

    const existingProject: Project = {
        id: 1,
        title: 'E-Commerce Dashboard',
        description: 'An e-commerce dashboard project',
        image_url: 'http://example.com/image.png',
        link: 'http://example.com',
        category: 'Web Development',
        featured: true,
        order_index: 1,
        created_at: '2023-01-01T00:00:00Z',
    };

    beforeEach(() => {
        mock = createMockDb();
    });

    describe('listProjects', () => {
        test('selects projects in display order', async () => {
            mock.statement.all.mockResolvedValue({ results: [existingProject] });

            const projects = await listProjects(mock.db);

            expect(projects).toEqual([existingProject]);
            expect(mock.prepare).toHaveBeenCalledWith(
                'SELECT * FROM projects ORDER BY featured DESC, category DESC, order_index ASC, created_at DESC'
            );
        });
    });

    describe('createProject', () => {
        const projectData = {
            title: 'New Portfolio',
            description: 'A new portfolio project',
            image_url: 'http://example.com/image.png',
            link: 'http://example.com',
            category: 'Web Development',
            featured: true,
            order_index: 1,
        };

        test('inserts a project and returns the created shape', async () => {
            mock.statement.run.mockResolvedValue({ meta: { last_row_id: 7 } });

            const project = await createProject(mock.db, projectData);

            expect(mock.prepare).toHaveBeenCalledWith(
                'INSERT INTO projects (title, description, image_url, link, category, featured, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)'
            );
            expect(mock.statement.bind).toHaveBeenCalledWith(
                projectData.title,
                projectData.description,
                projectData.image_url,
                projectData.link,
                projectData.category,
                projectData.featured,
                projectData.order_index
            );
            expect(mock.statement.run).toHaveBeenCalledWith();
            expect(project).toEqual({
                id: 7,
                ...projectData,
                created_at: expect.any(String),
            });
        });

        test('rejects missing required fields before inserting', async () => {
            await expect(createProject(mock.db, {
                ...projectData,
                title: '',
            })).rejects.toBeInstanceOf(MissingRequiredProjectFieldsError);

            await expect(createProject(mock.db, {
                ...projectData,
                featured: undefined as unknown as boolean,
            })).rejects.toBeInstanceOf(MissingRequiredProjectFieldsError);

            expect(mock.statement.run).not.toHaveBeenCalled();
        });

        test('rejects invalid featured/order combinations before inserting', async () => {
            await expect(createProject(mock.db, {
                ...projectData,
                featured: false,
                order_index: 1,
            })).rejects.toBeInstanceOf(InvalidProjectFeaturedOrderStateError);

            await expect(createProject(mock.db, {
                ...projectData,
                featured: true,
                order_index: null,
            })).rejects.toBeInstanceOf(InvalidProjectFeaturedOrderStateError);

            expect(mock.statement.run).not.toHaveBeenCalled();
        });
    });

    describe('updateProject', () => {
        test('updates only allowed defined fields', async () => {
            mock.statement.first.mockResolvedValue(existingProject);
            mock.statement.run.mockResolvedValue({ meta: { changes: 1 } });

            const result = await updateProject(mock.db, 1, {
                id: 99,
                title: 'Updated Dashboard',
                image_url: undefined,
                created_at: '2024-01-01T00:00:00Z',
            });

            expect(result).toEqual({ changes: 1 });
            expect(mock.statement.bind).toHaveBeenCalledWith('Updated Dashboard', 1);
            expect(mock.statement.run).toHaveBeenCalledWith();
            expect(mock.prepare).toHaveBeenLastCalledWith('UPDATE projects SET title = ? WHERE id = ?');
        });

        test('uses the final project state when validating featured/order updates', async () => {
            mock.statement.first.mockResolvedValue(existingProject);
            mock.statement.run.mockResolvedValue({ meta: { changes: 1 } });

            await expect(updateProject(mock.db, 1, {
                featured: false,
            })).rejects.toBeInstanceOf(InvalidProjectFeaturedOrderStateError);

            await expect(updateProject(mock.db, 1, {
                featured: false,
                order_index: null,
            })).resolves.toEqual({ changes: 1 });
        });

        test('rejects updates for missing projects', async () => {
            mock.statement.first.mockResolvedValue(undefined);

            await expect(updateProject(mock.db, 999, { title: 'Missing' })).rejects.toBeInstanceOf(ProjectNotFoundError);
            expect(mock.statement.run).not.toHaveBeenCalled();
        });

        test('rejects requests with no fields to update', async () => {
            mock.statement.first.mockResolvedValue(existingProject);

            await expect(updateProject(mock.db, 1, { id: 1 })).rejects.toBeInstanceOf(NoFieldsToUpdateError);
            expect(mock.statement.run).not.toHaveBeenCalled();
        });
    });

    describe('deleteProject', () => {
        test('deletes an existing project', async () => {
            mock.statement.run.mockResolvedValue({ meta: { changes: 1 } });

            await expect(deleteProject(mock.db, 1)).resolves.toBeUndefined();

            expect(mock.prepare).toHaveBeenCalledWith('DELETE FROM projects WHERE id = ?');
            expect(mock.statement.bind).toHaveBeenCalledWith(1);
            expect(mock.statement.run).toHaveBeenCalledWith();
        });

        test('rejects when no project was deleted', async () => {
            mock.statement.run.mockResolvedValue({ meta: { changes: 0 } });

            await expect(deleteProject(mock.db, 999)).rejects.toBeInstanceOf(ProjectNotFoundError);
        });
    });
});
