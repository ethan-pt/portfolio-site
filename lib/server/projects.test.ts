import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Project } from '@/types/db';
import {
    InvalidProjectReorderError,
    MissingRequiredProjectFieldsError,
    NoFieldsToUpdateError,
    ProjectConflictError,
    ProjectNotFoundError,
    createProject,
    createProjectWithSkills,
    deleteProject,
    listProjectDtos,
    listProjects,
    reorderFeaturedProjects,
    replaceProjectSkills,
    updateProject,
    updateProjectWithSkills,
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
    const db = {
        prepare: vi.fn(() => createMockStatement()),
        batch: vi.fn(),
    } as unknown as D1Database;

    return {
        db,
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
        category: 'Full-Stack',
        featured: true,
        order_index: 1,
        created_at: '2023-01-01T00:00:00Z',
    };

    const projectData = {
        title: 'New Portfolio',
        description: 'A new portfolio project',
        image_url: 'https://example.com/image.png',
        image_key: 'projects/new.png',
        link: 'https://example.com',
        category: '',
        featured: true,
        order_index: null,
    };

    beforeEach(() => {
        mock = createMockDb();
    });

    test('lists raw projects in display order', async () => {
        const statement = createMockStatement();
        statement.all.mockResolvedValue({ results: [existingProject] });
        mock.prepare.mockReturnValueOnce(statement);

        await expect(listProjects(mock.db)).resolves.toEqual([existingProject]);
        expect(mock.prepare).toHaveBeenCalledWith('SELECT * FROM projects ORDER BY featured DESC, order_index ASC, created_at DESC');
    });

    test('builds public DTOs with project categories and nested skill categories', async () => {
        const projectsStatement = createMockStatement();
        projectsStatement.all.mockResolvedValue({ results: [existingProject] });
        const projectCategoriesStatement = createMockStatement();
        projectCategoriesStatement.all.mockResolvedValue({ results: [
            { project_id: 1, id: 10, name: 'Back-End' },
            { project_id: 1, id: 11, name: 'Full-Stack' },
        ] });
        const projectSkillsStatement = createMockStatement();
        projectSkillsStatement.all.mockResolvedValue({ results: [
            { project_id: 1, skill_id: 7, skill_name: 'React', skill_featured: 1 },
            { project_id: 1, skill_id: 8, skill_name: 'TypeScript', skill_featured: 1 },
        ] });
        const skillCategoriesStatement = createMockStatement();
        skillCategoriesStatement.all.mockResolvedValue({ results: [
            { skill_id: 7, id: 12, name: 'Front-End' },
            { skill_id: 8, id: 13, name: 'Language' },
        ] });
        mock.prepare
            .mockReturnValueOnce(projectsStatement)
            .mockReturnValueOnce(projectCategoriesStatement)
            .mockReturnValueOnce(projectSkillsStatement)
            .mockReturnValueOnce(skillCategoriesStatement);

        const projects = await listProjectDtos(mock.db);

        expect(projects).toEqual([{
            id: 1,
            title: existingProject.title,
            description: existingProject.description,
            image_url: existingProject.image_url,
            link: existingProject.link,
            categories: [{ id: 10, name: 'Back-End' }, { id: 11, name: 'Full-Stack' }],
            featured: true,
            order_index: 1,
            skills: [
                { id: 7, name: 'React', categories: [{ id: 12, name: 'Front-End' }], featured: true },
                { id: 8, name: 'TypeScript', categories: [{ id: 13, name: 'Language' }], featured: true },
            ],
        }]);
    });

    test('creates a featured project with categories and skills in one batch', async () => {
        const categoriesStatement = createMockStatement();
        categoriesStatement.all.mockResolvedValue({ results: [{ id: 10, name: 'Full-Stack' }, { id: 11, name: 'DevOps' }] });
        const maxStatement = createMockStatement();
        maxStatement.first.mockResolvedValue({ max_order_index: 4 });
        mock.prepare.mockReturnValueOnce(categoriesStatement).mockReturnValueOnce(maxStatement).mockImplementation(() => createMockStatement());
        mock.batch.mockResolvedValue([]);

        const project = await createProjectWithSkills(mock.db, projectData, [10, 11], [7, 8]);

        expect(mock.prepare).toHaveBeenCalledWith('INSERT INTO projects (id, title, description, image_url, image_key, link, category, featured, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        expect(mock.prepare).toHaveBeenCalledWith('INSERT INTO project_categories (project_id, category_id) VALUES (?, ?)');
        expect(mock.prepare).toHaveBeenCalledWith('INSERT INTO project_skills (project_id, skill_id) VALUES (?, ?)');
        expect(mock.batch).toHaveBeenCalledTimes(1);
        expect(project).toEqual({ id: expect.any(Number), ...projectData, category: 'Full-Stack', order_index: 5, created_at: expect.any(String) });
    });

    test('clears order for non-featured creates before inserting', async () => {
        const categoriesStatement = createMockStatement();
        categoriesStatement.all.mockResolvedValue({ results: [{ id: 12, name: 'Tools' }] });
        mock.prepare.mockReturnValueOnce(categoriesStatement).mockImplementation(() => createMockStatement());
        mock.batch.mockResolvedValue([]);

        await createProject(mock.db, { ...projectData, title: 'Utility', description: 'A utility project', category: '', featured: false, order_index: 3 }, [12]);

        const insertStatement = mock.prepare.mock.results.find((result) => result.value.bind.mock.calls.some((call: unknown[]) => call.includes('Utility')))?.value;
        expect(insertStatement.bind).toHaveBeenCalledWith(expect.any(Number), 'Utility', 'A utility project', projectData.image_url, projectData.image_key, projectData.link, 'Tools', false, null);
    });

    test('rejects missing required fields before writing', async () => {
        const categoriesStatement = createMockStatement();
        categoriesStatement.all.mockResolvedValue({ results: [{ id: 10, name: 'Full-Stack' }] });
        const maxStatement = createMockStatement();
        maxStatement.first.mockResolvedValue({ max_order_index: 1 });
        mock.prepare.mockReturnValueOnce(categoriesStatement).mockReturnValueOnce(maxStatement);

        await expect(createProject(mock.db, { ...projectData, title: '' }, [10])).rejects.toBeInstanceOf(MissingRequiredProjectFieldsError);
        expect(mock.batch).not.toHaveBeenCalled();
    });

    test('updates allowed fields including explicit nulls and returns the updated project', async () => {
        const updatedProject = { ...existingProject, title: 'Updated Dashboard', image_url: null };
        const getStatement = createMockStatement();
        getStatement.first.mockResolvedValueOnce(existingProject);
        const updateStatement = createMockStatement();
        const updatedGetStatement = createMockStatement();
        updatedGetStatement.first.mockResolvedValueOnce(updatedProject);
        mock.prepare.mockReturnValueOnce(getStatement).mockReturnValueOnce(updateStatement).mockReturnValueOnce(updatedGetStatement);
        mock.batch.mockResolvedValue([]);

        const result = await updateProject(mock.db, 1, { title: 'Updated Dashboard', image_url: null });

        expect(result).toEqual(updatedProject);
        expect(updateStatement.bind).toHaveBeenCalledWith('Updated Dashboard', null, 1);
        expect(mock.prepare).toHaveBeenCalledWith('UPDATE projects SET title = ?, image_url = ? WHERE id = ?');
    });

    test('replaces project categories and skill relationships on update', async () => {
        const updatedProject = { ...existingProject, category: 'DevOps' };
        const getStatement = createMockStatement();
        getStatement.first.mockResolvedValueOnce(existingProject);
        const categoriesStatement = createMockStatement();
        categoriesStatement.all.mockResolvedValue({ results: [{ id: 11, name: 'DevOps' }] });
        const updatedGetStatement = createMockStatement();
        updatedGetStatement.first.mockResolvedValueOnce(updatedProject);
        mock.prepare
            .mockReturnValueOnce(getStatement)
            .mockReturnValueOnce(categoriesStatement)
            .mockReturnValueOnce(createMockStatement())
            .mockReturnValueOnce(createMockStatement())
            .mockReturnValueOnce(createMockStatement())
            .mockReturnValueOnce(createMockStatement())
            .mockReturnValueOnce(createMockStatement())
            .mockReturnValueOnce(updatedGetStatement)
            .mockImplementation(() => createMockStatement());
        mock.batch.mockResolvedValue([]);

        const result = await updateProjectWithSkills(mock.db, 1, {}, [11], [7]);

        expect(result).toEqual(updatedProject);
        expect(mock.prepare).toHaveBeenCalledWith('UPDATE projects SET category = ? WHERE id = ?');
        expect(mock.prepare).toHaveBeenCalledWith('DELETE FROM project_categories WHERE project_id = ?');
        expect(mock.prepare).toHaveBeenCalledWith('DELETE FROM project_skills WHERE project_id = ?');
    });

    test('appends a project when toggled from non-featured to featured', async () => {
        const existingNonFeatured = { ...existingProject, featured: false, order_index: null };
        const getStatement = createMockStatement();
        getStatement.first.mockResolvedValueOnce(existingNonFeatured);
        const maxStatement = createMockStatement();
        maxStatement.first.mockResolvedValueOnce({ max_order_index: 2 });
        const updateStatement = createMockStatement();
        const updatedGetStatement = createMockStatement();
        updatedGetStatement.first.mockResolvedValueOnce({ ...existingProject, order_index: 3 });
        mock.prepare.mockReturnValueOnce(getStatement).mockReturnValueOnce(maxStatement).mockReturnValueOnce(updateStatement).mockReturnValueOnce(updatedGetStatement);
        mock.batch.mockResolvedValue([]);

        await updateProject(mock.db, 1, { featured: true });

        expect(updateStatement.bind).toHaveBeenCalledWith(true, 3, 1);
    });

    test('clears order and compacts remaining featured projects when unfeatured', async () => {
        const getStatement = createMockStatement();
        getStatement.first.mockResolvedValueOnce(existingProject);
        const updateStatement = createMockStatement();
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
            .mockReturnValueOnce(updatedGetStatement)
            .mockImplementation(() => createMockStatement());
        mock.batch.mockResolvedValue([]);

        await updateProject(mock.db, 1, { featured: false });

        expect(updateStatement.bind).toHaveBeenCalledWith(false, null, 1);
        expect(mock.batch).toHaveBeenCalledTimes(2);
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
        mock.batch.mockResolvedValue([]);

        await reorderFeaturedProjects(mock.db, [3, 1, 2]);

        const reorderBinds = mock.prepare.mock.results.slice(1).map((result) => result.value.bind.mock.calls[0]);
        expect(reorderBinds).toEqual([[-1, 3], [-2, 1], [-3, 2], [1, 3], [2, 1], [3, 2]]);
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
        mock.batch.mockResolvedValue([]);

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
