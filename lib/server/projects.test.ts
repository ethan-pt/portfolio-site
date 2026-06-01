import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Project } from '@/types/db';
import {
    InvalidProjectFeaturedOrderStateError,
    MissingRequiredProjectFieldsError,
    NoFieldsToUpdateError,
    ProjectNotFoundError,
    createProject,
    deleteProject,
    listProjectDtos,
    listProjects,
    replaceProjectSkills,
    updateProject,
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
        mock.statement.all.mockResolvedValue({ results: [existingProject] });

        const projects = await listProjects(mock.db);

        expect(projects).toEqual([existingProject]);
        expect(mock.prepare).toHaveBeenCalledWith(
            'SELECT * FROM projects ORDER BY featured DESC, category DESC, order_index ASC, created_at DESC',
        );
    });

    test('groups public project DTO skills', async () => {
        mock.statement.all.mockResolvedValue({
            results: [
                { ...existingProject, skill_id: 7, skill_name: 'React', skill_category: 'Frontend', skill_featured: 1 },
                { ...existingProject, skill_id: 8, skill_name: 'TypeScript', skill_category: 'Language', skill_featured: 1 },
            ],
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

    test('inserts a project and returns the created shape', async () => {
        const projectData = {
            title: 'New Portfolio',
            description: 'A new portfolio project',
            image_url: 'https://example.com/image.png',
            image_key: 'projects/new.png',
            link: 'https://example.com',
            category: 'Web Development',
            featured: true,
            order_index: 1,
        };
        mock.statement.run.mockResolvedValue({ meta: { last_row_id: 7 } });

        const project = await createProject(mock.db, projectData);

        expect(mock.prepare).toHaveBeenCalledWith(
            'INSERT INTO projects (title, description, image_url, image_key, link, category, featured, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        );
        expect(mock.statement.bind).toHaveBeenCalledWith(
            projectData.title,
            projectData.description,
            projectData.image_url,
            projectData.image_key,
            projectData.link,
            projectData.category,
            projectData.featured,
            projectData.order_index,
        );
        expect(project).toEqual({ id: 7, ...projectData, created_at: expect.any(String) });
    });

    test('rejects missing required fields and invalid featured/order combinations before inserting', async () => {
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
        await expect(createProject(mock.db, { ...projectData, featured: false, order_index: 1 })).rejects.toBeInstanceOf(InvalidProjectFeaturedOrderStateError);
        await expect(createProject(mock.db, { ...projectData, featured: true, order_index: null })).rejects.toBeInstanceOf(InvalidProjectFeaturedOrderStateError);
        expect(mock.statement.run).not.toHaveBeenCalled();
    });

    test('updates allowed fields including explicit nulls and returns the updated project', async () => {
        const updatedProject = { ...existingProject, title: 'Updated Dashboard', image_url: null };
        mock.statement.first.mockResolvedValueOnce(existingProject).mockResolvedValueOnce(updatedProject);
        mock.statement.run.mockResolvedValue({ meta: { changes: 1 } });

        const result = await updateProject(mock.db, 1, {
            id: 99,
            title: 'Updated Dashboard',
            image_url: null,
            created_at: '2024-01-01T00:00:00Z',
        });

        expect(result).toEqual(updatedProject);
        expect(mock.statement.bind).toHaveBeenCalledWith('Updated Dashboard', null, 1);
        expect(mock.prepare).toHaveBeenCalledWith('UPDATE projects SET title = ?, image_url = ? WHERE id = ?');
    });

    test('rejects missing projects and no-op updates', async () => {
        mock.statement.first.mockResolvedValue(undefined);
        await expect(updateProject(mock.db, 999, { title: 'Missing' })).rejects.toBeInstanceOf(ProjectNotFoundError);

        mock.statement.first.mockResolvedValue(existingProject);
        await expect(updateProject(mock.db, 1, { id: 1 })).rejects.toBeInstanceOf(NoFieldsToUpdateError);
    });

    test('replaces project skill relationships', async () => {
        mock.statement.first.mockResolvedValue(existingProject);
        mock.statement.run.mockResolvedValue({ meta: { changes: 1 } });

        await replaceProjectSkills(mock.db, 1, [2, 2, 3]);

        expect(mock.prepare).toHaveBeenCalledWith('DELETE FROM project_skills WHERE project_id = ?');
        expect(mock.prepare).toHaveBeenCalledWith('INSERT INTO project_skills (project_id, skill_id) VALUES (?, ?)');
    });

    test('deletes an existing project and rejects missing deletes', async () => {
        mock.statement.run.mockResolvedValueOnce({ meta: { changes: 1 } }).mockResolvedValueOnce({ meta: { changes: 0 } });

        await expect(deleteProject(mock.db, 1)).resolves.toBeUndefined();
        await expect(deleteProject(mock.db, 999)).rejects.toBeInstanceOf(ProjectNotFoundError);
    });
});
