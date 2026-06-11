import type { AdminProjectDto, ProjectDto } from '@/types/api';
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

export class ProjectConflictError extends Error {
    constructor(message = 'Project conflicts with an existing record') {
        super(message);
        this.name = 'ProjectConflictError';
    }
}

export class InvalidProjectReorderError extends Error {
    constructor(message = 'Invalid project reorder request') {
        super(message);
        this.name = 'InvalidProjectReorderError';
    }
}

interface ProjectSkillRow extends Project {
    skill_id: number | null;
    skill_name: string | null;
    skill_category: string | null;
    skill_featured: boolean | number | null;
}

function normalizeProject(project: Project): Project {
    return {
        ...project,
        image_url: project.image_url ?? null,
        image_key: project.image_key ?? null,
        featured: Boolean(project.featured),
        order_index: project.order_index ?? null,
    };
}

function isConflictError(error: unknown): boolean {
    return error instanceof Error && /unique|constraint/i.test(error.message);
}

function validateProjectFeaturedOrderState(featured: boolean, orderIndex: number | null | undefined): void {
    if ((featured === true && orderIndex == null) || (featured === false && orderIndex !== null)) {
        throw new InvalidProjectFeaturedOrderStateError();
    }
}

function createProjectId(): number {
    const bytes = new Uint32Array(1);
    crypto.getRandomValues(bytes);
    return bytes[0] || createProjectId();
}

function projectUpdateFields(projectData: Partial<Project>): { fields: string[]; values: unknown[] } {
    const updates: Partial<Omit<Project, 'id' | 'created_at'>> = {
        title: projectData.title,
        description: projectData.description,
        image_url: projectData.image_url,
        image_key: projectData.image_key,
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

    return { fields, values };
}

function projectSkillStatements(db: D1Database, projectId: number, skillIds: number[]): D1PreparedStatement[] {
    const uniqueSkillIds = [...new Set(skillIds)];

    return [
        db.prepare('DELETE FROM project_skills WHERE project_id = ?').bind(projectId),
        ...uniqueSkillIds.map((skillId) => (
            db.prepare('INSERT INTO project_skills (project_id, skill_id) VALUES (?, ?)').bind(projectId, skillId)
        )),
    ];
}

async function batchProjectWrite(db: D1Database, statements: D1PreparedStatement[]): Promise<void> {
    if (statements.length === 0) {
        return;
    }

    try {
        await db.batch(statements);
    } catch (error) {
        if (isConflictError(error)) {
            throw new ProjectConflictError('Project skill relationship conflicts with existing data');
        }
        throw error;
    }
}

async function nextFeaturedOrderIndex(db: D1Database): Promise<number> {
    const row = await db.prepare(
        'SELECT COALESCE(MAX(order_index), 0) AS max_order_index FROM projects WHERE featured = 1'
    ).first<{ max_order_index: number | null }>();

    return (row?.max_order_index ?? 0) + 1;
}

async function featuredProjectIds(db: D1Database): Promise<number[]> {
    const { results } = await db.prepare(
        'SELECT id FROM projects WHERE featured = 1 ORDER BY order_index ASC, created_at DESC'
    ).all<{ id: number }>();

    return results.map((project) => project.id);
}

function reorderStatements(db: D1Database, projectIds: number[]): D1PreparedStatement[] {
    return [
        ...projectIds.map((projectId, index) => (
            db.prepare('UPDATE projects SET order_index = ? WHERE id = ?').bind(-(index + 1), projectId)
        )),
        ...projectIds.map((projectId, index) => (
            db.prepare('UPDATE projects SET order_index = ? WHERE id = ?').bind(index + 1, projectId)
        )),
    ];
}

async function compactFeaturedProjectOrder(db: D1Database): Promise<void> {
    const currentFeaturedIds = await featuredProjectIds(db);

    if (currentFeaturedIds.length === 0) {
        return;
    }

    await batchProjectWrite(db, reorderStatements(db, currentFeaturedIds));
}

function assertProjectReorderIds(projectIds: number[]): void {
    if (!Array.isArray(projectIds) || projectIds.some((id) => !Number.isInteger(id) || id <= 0)) {
        throw new InvalidProjectReorderError('Invalid project IDs');
    }

    if (new Set(projectIds).size !== projectIds.length) {
        throw new InvalidProjectReorderError('Duplicate project IDs');
    }
}

function assertSameProjectIds(submittedIds: number[], currentIds: number[]): void {
    if (submittedIds.length !== currentIds.length) {
        throw new ProjectConflictError('Featured project order is stale. Refresh and try again.');
    }

    const currentIdSet = new Set(currentIds);
    if (submittedIds.some((id) => !currentIdSet.has(id))) {
        throw new ProjectConflictError('Featured project order is stale. Refresh and try again.');
    }
}

async function prepareProjectCreate(db: D1Database, projectData: Omit<Project, 'id' | 'created_at'>): Promise<Omit<Project, 'id' | 'created_at'>> {
    const normalizedProject = {
        ...projectData,
        order_index: projectData.featured ? await nextFeaturedOrderIndex(db) : null,
    };

    validateProjectFeaturedOrderState(normalizedProject.featured, normalizedProject.order_index);
    return normalizedProject;
}

async function prepareProjectUpdate(db: D1Database, existingProject: Project, projectData: Partial<Project>): Promise<Partial<Project>> {
    const nextProjectData = { ...projectData };
    const finalFeatured = nextProjectData.featured !== undefined ? nextProjectData.featured : existingProject.featured;

    if (finalFeatured) {
        if (!existingProject.featured) {
            nextProjectData.order_index = await nextFeaturedOrderIndex(db);
        }
    } else {
        nextProjectData.order_index = null;
    }

    const finalOrderIndex = nextProjectData.order_index !== undefined ? nextProjectData.order_index : existingProject.order_index;
    validateProjectFeaturedOrderState(finalFeatured, finalOrderIndex);
    return nextProjectData;
}

async function listProjectDtoRows(db: D1Database): Promise<AdminProjectDto[]> {
    const { results } = await db.prepare(
        `SELECT
            projects.*,
            skills.id AS skill_id,
            skills.name AS skill_name,
            skills.category AS skill_category,
            skills.featured AS skill_featured
        FROM projects
        LEFT JOIN project_skills ON project_skills.project_id = projects.id
        LEFT JOIN skills ON skills.id = project_skills.skill_id
        ORDER BY projects.featured DESC, projects.order_index ASC, projects.category DESC, projects.created_at DESC, skills.name ASC`
    ).all<ProjectSkillRow>();

    const projects = new Map<number, AdminProjectDto>();

    for (const row of results) {
        let project = projects.get(row.id);

        if (!project) {
            project = {
                id: row.id,
                title: row.title,
                description: row.description,
                image_url: row.image_url ?? null,
                image_key: row.image_key ?? null,
                link: row.link,
                category: row.category,
                featured: Boolean(row.featured),
                order_index: row.order_index ?? null,
                skills: [],
            };
            projects.set(row.id, project);
        }

        if (row.skill_id !== null && row.skill_name && row.skill_category) {
            project.skills.push({
                id: row.skill_id,
                name: row.skill_name,
                category: row.skill_category,
                featured: Boolean(row.skill_featured),
            });
        }
    }

    return [...projects.values()];
}

export async function listProjectDtos(db: D1Database): Promise<ProjectDto[]> {
    const projects = await listProjectDtoRows(db);

    return projects.map((project) => ({
        id: project.id,
        title: project.title,
        description: project.description,
        image_url: project.image_url,
        link: project.link,
        category: project.category,
        featured: project.featured,
        order_index: project.order_index,
        skills: project.skills,
    }));
}

export async function listAdminProjectDtos(db: D1Database): Promise<AdminProjectDto[]> {
    return listProjectDtoRows(db);
}

export async function listProjects(db: D1Database): Promise<Project[]> {
    const { results } = await db.prepare(
        'SELECT * FROM projects ORDER BY featured DESC, order_index ASC, category DESC, created_at DESC'
    ).all<Project>();

    return results.map(normalizeProject);
}

export async function createProject(db: D1Database, projectData: Omit<Project, 'id' | 'created_at'>): Promise<Project> {
    const preparedProject = await prepareProjectCreate(db, projectData);
    const { title, description, image_url, image_key, link, category, featured, order_index } = preparedProject;

    if (!title || !description || !link || !category || typeof featured !== 'boolean') {
        throw new MissingRequiredProjectFieldsError();
    }

    try {
        const result = await db.prepare(
            'INSERT INTO projects (title, description, image_url, image_key, link, category, featured, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(title, description, image_url ?? null, image_key ?? null, link, category, featured, order_index).run();

        return {
            id: result.meta.last_row_id,
            title,
            description,
            image_url: image_url ?? null,
            image_key: image_key ?? null,
            link,
            category,
            featured,
            order_index,
            created_at: new Date().toISOString(),
        };
    } catch (error) {
        if (isConflictError(error)) {
            throw new ProjectConflictError();
        }
        throw error;
    }
}

export async function createProjectWithSkills(db: D1Database, projectData: Omit<Project, 'id' | 'created_at'>, skillIds: number[]): Promise<Project> {
    const preparedProject = await prepareProjectCreate(db, projectData);
    const { title, description, image_url, image_key, link, category, featured, order_index } = preparedProject;

    if (!title || !description || !link || !category || typeof featured !== 'boolean') {
        throw new MissingRequiredProjectFieldsError();
    }

    const id = createProjectId();

    const statements = [
        db.prepare(
            'INSERT INTO projects (id, title, description, image_url, image_key, link, category, featured, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(id, title, description, image_url ?? null, image_key ?? null, link, category, featured, order_index),
        ...projectSkillStatements(db, id, skillIds),
    ];

    try {
        await db.batch(statements);

        return {
            id,
            title,
            description,
            image_url: image_url ?? null,
            image_key: image_key ?? null,
            link,
            category,
            featured,
            order_index,
            created_at: new Date().toISOString(),
        };
    } catch (error) {
        if (isConflictError(error)) {
            throw new ProjectConflictError();
        }
        throw error;
    }
}

export async function getProjectById(db: D1Database, id: number): Promise<Project | null> {
    const project = await db.prepare(
        'SELECT * FROM projects WHERE id = ?'
    ).bind(id).first<Project>();

    return project ? normalizeProject(project) : null;
}

export async function updateProject(db: D1Database, id: number, projectData: Partial<Project>): Promise<Project> {
    const existingProject = await getProjectById(db, id);

    if (!existingProject) {
        throw new ProjectNotFoundError();
    }

    const preparedProjectData = await prepareProjectUpdate(db, existingProject, projectData);
    const { fields, values } = projectUpdateFields(preparedProjectData);

    if (fields.length === 0) {
        throw new NoFieldsToUpdateError();
    }

    try {
        await db.prepare(
            `UPDATE projects SET ${fields.join(', ')} WHERE id = ?`
        ).bind(...values, id).run();
    } catch (error) {
        if (isConflictError(error)) {
            throw new ProjectConflictError();
        }
        throw error;
    }

    if (existingProject.featured && preparedProjectData.featured === false) {
        await compactFeaturedProjectOrder(db);
    }

    const updatedProject = await getProjectById(db, id);

    if (!updatedProject) {
        throw new ProjectNotFoundError();
    }

    return updatedProject;
}

export async function updateProjectWithSkills(db: D1Database, id: number, projectData: Partial<Project>, skillIds: number[] | null): Promise<Project> {
    const existingProject = await getProjectById(db, id);

    if (!existingProject) {
        throw new ProjectNotFoundError();
    }

    const preparedProjectData = await prepareProjectUpdate(db, existingProject, projectData);
    const { fields, values } = projectUpdateFields(preparedProjectData);

    if (fields.length === 0 && skillIds === null) {
        throw new NoFieldsToUpdateError();
    }

    const statements: D1PreparedStatement[] = [];

    if (fields.length > 0) {
        statements.push(db.prepare(
            `UPDATE projects SET ${fields.join(', ')} WHERE id = ?`
        ).bind(...values, id));
    }

    if (skillIds !== null) {
        statements.push(...projectSkillStatements(db, id, skillIds));
    }

    await batchProjectWrite(db, statements);

    if (existingProject.featured && preparedProjectData.featured === false) {
        await compactFeaturedProjectOrder(db);
    }

    const updatedProject = await getProjectById(db, id);

    if (!updatedProject) {
        throw new ProjectNotFoundError();
    }

    return updatedProject;
}

export async function deleteProject(db: D1Database, id: number): Promise<void> {
    const existingProject = await getProjectById(db, id);

    if (!existingProject) {
        throw new ProjectNotFoundError();
    }

    const result = await db.prepare(
        'DELETE FROM projects WHERE id = ?'
    ).bind(id).run();

    if (result.meta.changes === 0) {
        throw new ProjectNotFoundError();
    }

    if (existingProject.featured) {
        await compactFeaturedProjectOrder(db);
    }
}

export async function reorderFeaturedProjects(db: D1Database, projectIds: number[]): Promise<void> {
    assertProjectReorderIds(projectIds);

    const currentFeaturedIds = await featuredProjectIds(db);
    assertSameProjectIds(projectIds, currentFeaturedIds);
    await batchProjectWrite(db, reorderStatements(db, projectIds));
}

export async function replaceProjectSkills(db: D1Database, projectId: number, skillIds: number[]): Promise<void> {
    const existingProject = await getProjectById(db, projectId);

    if (!existingProject) {
        throw new ProjectNotFoundError();
    }

    await batchProjectWrite(db, projectSkillStatements(db, projectId, skillIds));
}
