import type { Project } from '@/types/db';

export class ProjectNotFoundError extends Error {
    constructor(message = 'Project not found') {
        super(message);
        this.name = 'ProjectNotFoundError';
    }
}

export class NoFieldsToUpdateError extends Error {
    constructor(message = 'No fields to update') {
        super(message);
        this.name = 'NoFieldsToUpdateError';
    }
}

export class MissingRequiredProjectFieldsError extends Error {
    constructor(message = 'Missing required fields') {
        super(message);
        this.name = 'MissingRequiredProjectFieldsError';
    }
}

export class InvalidProjectFeaturedOrderStateError extends Error {
    constructor(message = 'Projects must either be featured and ordered, or non-featured and unordered') {
        super(message);
        this.name = 'InvalidProjectFeaturedOrderStateError';
    }
}

function validateProjectFeaturedOrderState(featured: boolean, orderIndex: number | null | undefined): void {
    if ((featured === true && orderIndex == null) || (featured === false && orderIndex !== null)) {
        throw new InvalidProjectFeaturedOrderStateError();
    }
}

export async function listProjects(db: D1Database): Promise<Project[]> {
    const { results } = await db.prepare(
        'SELECT * FROM projects ORDER BY featured DESC, category DESC, order_index ASC, created_at DESC'
    ).all<Project>();

    return results;
}

export async function createProject(db: D1Database, projectData: Omit<Project, 'id' | 'created_at'>): Promise<Project> {
    const { title, description, image_url, link, category, featured, order_index } = projectData;

    if (!title || !description || !link || !category || typeof featured !== 'boolean') {
        throw new MissingRequiredProjectFieldsError();
    }

    validateProjectFeaturedOrderState(featured, order_index);

    const result = await db.prepare(
        'INSERT INTO projects (title, description, image_url, link, category, featured, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(title, description, image_url, link, category, featured, order_index).run();

    return {
        id: result.meta.last_row_id,
        title,
        description,
        image_url,
        link,
        category,
        featured,
        order_index,
        created_at: new Date().toISOString(),
    };
}

export async function getProjectById(db: D1Database, id: number): Promise<Project | null> {
    const project = await db.prepare(
        'SELECT * FROM projects WHERE id = ?'
    ).bind(id).first<Project>();

    return project ?? null;
}

export async function updateProject(db: D1Database, id: number, projectData: Partial<Project>): Promise<{ changes: number }> {
    const existingProject = await getProjectById(db, id);

    if (!existingProject) {
        throw new ProjectNotFoundError();
    }

    const finalFeatured = projectData.featured !== undefined ? projectData.featured : existingProject.featured;
    const finalOrderIndex = projectData.order_index !== undefined ? projectData.order_index : existingProject.order_index;

    validateProjectFeaturedOrderState(finalFeatured, finalOrderIndex);

    const updates: Partial<Omit<Project, 'id' | 'created_at'>> = {
        title: projectData.title,
        description: projectData.description,
        image_url: projectData.image_url,
        link: projectData.link,
        category: projectData.category,
        featured: projectData.featured,
        order_index: projectData.order_index,
    };

    const fields: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(updates)) {
        if (value === undefined) {
            continue;
        }

        fields.push(`${key} = ?`);
        values.push(value);
    }

    if (fields.length === 0) {
        throw new NoFieldsToUpdateError();
    }

    values.push(id);

    const result = await db.prepare(
        `UPDATE projects SET ${fields.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    return { changes: result.meta.changes };
}

export async function deleteProject(db: D1Database, id: number): Promise<void> {
    const result = await db.prepare(
        'DELETE FROM projects WHERE id = ?'
    ).bind(id).run();

    if (result.meta.changes === 0) {
        throw new ProjectNotFoundError();
    }
}
