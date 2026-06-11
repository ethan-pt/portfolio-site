import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Project } from '@/types/db';
import {
    InvalidProjectReorderError,
    MissingRequiredProjectFieldsError,
    NoFieldsToUpdateError,
    ProjectConflictError,
    ProjectNotFoundError,
    createProject,
    deleteProject,
    listProjectDtos,
    listProjects,
    reorderFeaturedProjects,
    replaceProjectSkills,
    updateProject,
} from './projects';

function createMockStatement() {
    const statement = {
        bind: vi.fn(),
        all: vi.fn(),
        first: vi.fn(),
        run: vi.fn(),
    };

    statement.bind.mockReturnValue(statement);
    return statement;
}

function createMockDb() {
    const statements: ReturnType<typeof createMockStatement>[] = [];

    const db = {
        prepare: vi.fn(() => {
            const statement = createMockStatement();
            statements.push(statement);
            return statement;
        }),
        batch: vi.fn(),
    } as unknown as D1Database;

    return {
        db,
        statements,
        prepare: db.prepare as ReturnType<typeof vi.fn>,
        batch: db.batch as ReturnType<typeof vi.fn>,
    };
}

describe('project data access', () => {
    let mock: ReturnType<typeof createMockDb>;

    const existingProject: Project = {
        id: 1,
        title: 'E-Commerce Dashboard',
        description: 'An e-commerce dashboard project',
        image_url: 'https://example.com/image.png',
        image_key: 'projects/image.png',
        link: 'https://example.com',
        category: 'Web Development',
        featured: true,
        order_index: 1,
        created_at: '2023-01-01T00:00:00Z',
    };

    beforeEach(() => {
        mock = createMockDb();
    });

    test('lists raw admin projects in display order', async () => {
        mock.prepare.mockImplementationOnce(() => {
            const statement = createMockStatement();
            statement.all.mockResolvedValue({ results: [existingProject] });
            return statement;
        });

        const projects = await listProjects(mock.db);

        expect(projects).toEqual([existingProject]);
        expect(mock.prepare).toHaveBeenCalledWith(
            'SELECT * FROM projects ORDER BY featured DESC, order_index ASC, category DESC, created_at DESC',
        );
    });

    test('groups public project DTO skills without exposing image_key', async () => {
        mock.prepare.mockImplementationOnce(() => {
            const statement = createMockStatement();
            statement.all.mockResolvedValue({
                results: [
                    { ...existingProject, skill_id: 7, skill_name: 'React', skill_category: 'Frontend', skill_featured: 1 },
                    { ...existingProject, skill_id: 8, skill_name: 'TypeScript', skill_category: 'Language', skill_featured: 1 },
                ],
            });
            return statement;
        });

        const projects = await listProjectDtos(mock.db);

        expect(projects).toEqual([{
            id: 1,
            title: existingProject.title,
            description: existingProject.description,
            image_url: existingProject.image_url,
            link: existingProject.link,
            category: existingProject.category,
            featured: true,
            order_index: 1,
            skills: [
                { id: 7, name: 'React', category: 'Frontend', featured: true },
                { id: 8, name: 'TypeScript', category: 'Language', featured: true },
            ],
        }]);
    });

    test('appends a new featured project to the end when order_index is omitted', async () => {
        const maxStatement = createMockStatement();
        maxStatement.first.mockResolvedValue({ max_order_index: 4 });
        const insertStatement = createMockStatement();
        insertStatement.run.mockResolvedValue({ meta: { last_row_id: 7 } });
        mock.prepare.mockReturnValueOnce(maxStatement).mockReturnValueOnce(insertStatement);

        const projectData = {
            title: 'New Portfolio',
            description: 'A new portfolio project',
            image_url: 'https://example.com/image.png',
            image_key: 'projects/new.png',
            link: 'https://example.com',
            category: 'Web Development',
            featured: true,
            order_index: null,
        };

        const project = await createProject(mock.db, projectData);

        expect(insertStatement.bind).toHaveBeenCalledWith(
            projectData.title,
            projectData.description,
            projectData.image_url,
            projectData.image_key,
            projectData.link,
            projectData.category,
            projectData.featured,
            5,
        );
        expect(project).toEqual({ id: 7, ...projectData, order_index: 5, created_at: expect.any(String) });
    });

    test('clears order for non-featured creates before inserting', async () => {
        const insertStatement = createMockStatement();
        insertStatement.run.mockResolvedValue({ meta: { last_row_id: 8 } });
        mock.prepare.mockReturnValueOnce(insertStatement);

        await createProject(mock.db, {
            title: 'Utility',
            description: 'A utility project',
            image_url: null,
            image_key: null,
            link: 'https://example.com',
            category: 'Tools',
            featured: false,
            order_index: 3,
        });

        expect(insertStatement.bind).toHaveBeenCalledWith('Utility', 'A utility project', null, null, 'https://example.com', 'Tools', false, null);
    });

    test('rejects missing required fields before inserting', async () => {
        const projectData = {
            title: 'New Portfolio',
            description: 'A new portfolio project',
            image_url: null,
            image_key: null,
            link: 'https://example.com',
            category: 'Web Development',
            featured: true,
            order_index: 1,
        };

        await expect(createProject(mock.db, { ...projectData, title: '' })).rejects.toBeInstanceOf(MissingRequiredProjectFieldsError);
    });

    test('updates allowed fields including explicit nulls and returns the updated project', async () => {
        const updatedProject = { ...existingProject, title: 'Updated Dashboard', image_url: null };
        const getStatement = createMockStatement();
        getStatement.first.mockResolvedValueOnce(existingProject);
        const updateStatement = createMockStatement();
        updateStatement.run.mockResolvedValue({ meta: { changes: 1 } });
        const updatedGetStatement = createMockStatement();
        updatedGetStatement.first.mockResolvedValueOnce(updatedProject);
        mock.prepare.mockReturnValueOnce(getStatement).mockReturnValueOnce(updateStatement).mockReturnValueOnce(updatedGetStatement);

        const result = await updateProject(mock.db, 1, {
            id: 99,
            title: 'Updated Dashboard',
            image_url: null,
            created_at: '2024-01-01T00:00:00Z',
        });

        expect(result).toEqual(updatedProject);
        expect(updateStatement.bind).toHaveBeenCalledWith('Updated Dashboard', null, 1);
        expect(mock.prepare).toHaveBeenCalledWith('UPDATE projects SET title = ?, image_url = ? WHERE id = ?');
    });

    test('appends a project when toggled from non-featured to featured', async () => {
        const existingNonFeatured = { ...existingProject, featured: false, order_index: null };
        const getStatement = createMockStatement();
        getStatement.first.mockResolvedValueOnce(existingNonFeatured);
        const maxStatement = createMockStatement();
        maxStatement.first.mockResolvedValueOnce({ max_order_index: 2 });
        const updateStatement = createMockStatement();
        updateStatement.run.mockResolvedValue({ meta: { changes: 1 } });
        const updatedGetStatement = createMockStatement();
        updatedGetStatement.first.mockResolvedValueOnce({ ...existingProject, order_index: 3 });
        mock.prepare.mockReturnValueOnce(getStatement).mockReturnValueOnce(maxStatement).mockReturnValueOnce(updateStatement).mockReturnValueOnce(updatedGetStatement);

        await updateProject(mock.db, 1, { featured: true });

        expect(updateStatement.bind).toHaveBeenCalledWith(true, 3, 1);
    });

    test('clears order and compacts remaining featured projects when unfeatured', async () => {
        const getStatement = createMockStatement();
        getStatement.first.mockResolvedValueOnce(existingProject);
        const updateStatement = createMockStatement();
        updateStatement.run.mockResolvedValue({ meta: { changes: 1 } });
        const featuredStatement = createMockStatement();
        featuredStatement.all.mockResolvedValue({ results: [{ id: 2 }, { id: 3 }] });
        const updatedGetStatement = createMockStatement();
        updatedGetStatement.first.mockResolvedValueOnce({ ...existingProject, featured: false, order_index: null });
        mock.prepare
            .mockReturnValueOnce(getStatement)
            .mockReturnValueOnce(updateStatement)
            .mockReturnValueOnce(featuredStatement)
            .mockReturnValueOnce(createMockStatement())
            .mockReturnValueOnce(createMockStatement())
            .mockReturnValueOnce(createMockStatement())
            .mockReturnValueOnce(createMockStatement())
            .mockReturnValueOnce(updatedGetStatement);

        await updateProject(mock.db, 1, { featured: false });

        expect(updateStatement.bind).toHaveBeenCalledWith(false, null, 1);
        expect(mock.batch).toHaveBeenCalledTimes(1);
        expect(updatedGetStatement.first).toHaveBeenCalledTimes(1);
    });

    test('rejects missing projects and no-op updates', async () => {
        const missingStatement = createMockStatement();
        missingStatement.first.mockResolvedValue(undefined);
        mock.prepare.mockReturnValueOnce(missingStatement);
        await expect(updateProject(mock.db, 999, { title: 'Missing' })).rejects.toBeInstanceOf(ProjectNotFoundError);

        const existingStatement = createMockStatement();
        existingStatement.first.mockResolvedValue(existingProject);
        mock.prepare.mockReturnValueOnce(existingStatement);
        await expect(updateProject(mock.db, 1, { id: 1 })).rejects.toBeInstanceOf(NoFieldsToUpdateError);
    });

    test('reorders featured projects with temporary negative values before final indexes', async () => {
        const featuredStatement = createMockStatement();
        featuredStatement.all.mockResolvedValue({ results: [{ id: 1 }, { id: 2 }, { id: 3 }] });
        mock.prepare.mockReturnValueOnce(featuredStatement).mockImplementation(() => createMockStatement());

        await reorderFeaturedProjects(mock.db, [3, 1, 2]);

        const reorderBinds = mock.prepare.mock.results.slice(1).map((result) => result.value.bind.mock.calls[0]);
        expect(reorderBinds).toEqual([
            [-1, 3],
            [-2, 1],
            [-3, 2],
            [1, 3],
            [2, 1],
            [3, 2],
        ]);
        expect(mock.batch).toHaveBeenCalledTimes(1);
    });

    test('rejects invalid or stale featured reorder IDs', async () => {
        await expect(reorderFeaturedProjects(mock.db, [1, 1])).rejects.toBeInstanceOf(InvalidProjectReorderError);
        await expect(reorderFeaturedProjects(mock.db, [1, 0])).rejects.toBeInstanceOf(InvalidProjectReorderError);

        const featuredStatement = createMockStatement();
        featuredStatement.all.mockResolvedValue({ results: [{ id: 1 }, { id: 2 }] });
        mock.prepare.mockReturnValueOnce(featuredStatement);

        await expect(reorderFeaturedProjects(mock.db, [1, 3])).rejects.toBeInstanceOf(ProjectConflictError);
    });

    test('replaces project skill relationships', async () => {
        const getStatement = createMockStatement();
        getStatement.first.mockResolvedValue(existingProject);
        mock.prepare.mockReturnValueOnce(getStatement).mockImplementation(() => createMockStatement());
        mock.batch.mockResolvedValue([]);

        await replaceProjectSkills(mock.db, 1, [2, 2, 3]);

        expect(mock.prepare).toHaveBeenCalledWith('DELETE FROM project_skills WHERE project_id = ?');
        expect(mock.prepare).toHaveBeenCalledWith('INSERT INTO project_skills (project_id, skill_id) VALUES (?, ?)');
        expect(mock.batch).toHaveBeenCalledTimes(1);
    });

    test('deletes an existing project and compacts featured order', async () => {
        const getStatement = createMockStatement();
        getStatement.first.mockResolvedValue(existingProject);
        const deleteStatement = createMockStatement();
        deleteStatement.run.mockResolvedValue({ meta: { changes: 1 } });
        const featuredStatement = createMockStatement();
        featuredStatement.all.mockResolvedValue({ results: [{ id: 2 }] });
        mock.prepare.mockReturnValueOnce(getStatement).mockReturnValueOnce(deleteStatement).mockReturnValueOnce(featuredStatement).mockImplementation(() => createMockStatement());

        await expect(deleteProject(mock.db, 1)).resolves.toBeUndefined();

        expect(mock.batch).toHaveBeenCalledTimes(1);
    });

    test('delete rejects missing projects before deleting', async () => {
        const getStatement = createMockStatement();
        getStatement.first.mockResolvedValue(undefined);
        mock.prepare.mockReturnValueOnce(getStatement);

        await expect(deleteProject(mock.db, 999)).rejects.toBeInstanceOf(ProjectNotFoundError);
    });
});
