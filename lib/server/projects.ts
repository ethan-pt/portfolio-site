import type { AdminProjectDto, CategoryDto, ProjectDto, ProjectSkillDto } from '@/types/api';
import type { Project } from '@/types/db';
import { categoryAssignmentStatements, requireCategoriesByIds } from './categories';

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

interface ProjectCategoryRow {
    project_id: number;
    id: number;
    name: string;
}

interface ProjectSkillRow {
    project_id: number;
    skill_id: number;
    skill_name: string;
    skill_featured: boolean | number;
}

interface SkillCategoryRow {
    skill_id: number;
    id: number;
    name: string;
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
        if (value === undefined) continue;
        fields.push(`${key} = ?`);
        values.push(value);
    }

    return { fields, values };
}

function projectSkillStatements(db: D1Database, projectId: number, skillIds: number[]): D1PreparedStatement[] {
    const uniqueSkillIds = [...new Set(skillIds)];

    return [
        db.prepare('DELETE FROM project_skills WHERE project_id = ?').bind(projectId),
        ...uniqueSkillIds.map((skillId) => db.prepare('INSERT INTO project_skills (project_id, skill_id) VALUES (?, ?)').bind(projectId, skillId)),
    ];
}

async function batchProjectWrite(db: D1Database, statements: D1PreparedStatement[], conflictMessage = 'Project conflicts with existing data'): Promise<void> {
    if (statements.length === 0) return;

    try {
        await db.batch(statements);
    } catch (error) {
        if (isConflictError(error)) {
            throw new ProjectConflictError(conflictMessage);
        }
        throw error;
    }
}

async function nextFeaturedOrderIndex(db: D1Database): Promise<number> {
    const row = await db.prepare('SELECT COALESCE(MAX(order_index), 0) AS max_order_index FROM projects WHERE featured = 1').first<{ max_order_index: number | null }>();
    return (row?.max_order_index ?? 0) + 1;
}

async function featuredProjectIds(db: D1Database): Promise<number[]> {
    const { results } = await db.prepare('SELECT id FROM projects WHERE featured = 1 ORDER BY order_index ASC, created_at DESC').all<{ id: number }>();
    return results.map((project) => project.id);
}

function reorderStatements(db: D1Database, projectIds: number[]): D1PreparedStatement[] {
    return [
        ...projectIds.map((projectId, index) => db.prepare('UPDATE projects SET order_index = ? WHERE id = ?').bind(-(index + 1), projectId)),
        ...projectIds.map((projectId, index) => db.prepare('UPDATE projects SET order_index = ? WHERE id = ?').bind(index + 1, projectId)),
    ];
}

async function compactFeaturedProjectOrder(db: D1Database): Promise<void> {
    const currentFeaturedIds = await featuredProjectIds(db);
    if (currentFeaturedIds.length === 0) return;
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

async function prepareProjectCreate(db: D1Database, projectData: Omit<Project, 'id' | 'created_at'>, categories: CategoryDto[]): Promise<Omit<Project, 'id' | 'created_at'>> {
    const normalizedProject = {
        ...projectData,
        category: categories[0]?.name ?? '',
        order_index: projectData.featured ? await nextFeaturedOrderIndex(db) : null,
    };

    validateProjectFeaturedOrderState(normalizedProject.featured, normalizedProject.order_index);
    return normalizedProject;
}

async function prepareProjectUpdate(db: D1Database, existingProject: Project, projectData: Partial<Project>, categories: CategoryDto[] | null): Promise<Partial<Project>> {
    const nextProjectData = { ...projectData };

    if (categories) {
        nextProjectData.category = categories[0]?.name ?? '';
    }

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
    const { results: projectRows } = await db.prepare('SELECT * FROM projects ORDER BY featured DESC, order_index ASC, created_at DESC').all<Project>();
    const projects = projectRows.map(normalizeProject);

    if (projects.length === 0) {
        return [];
    }

    const projectIds = projects.map((project) => project.id);
    const placeholders = projectIds.map(() => '?').join(', ');

    const { results: projectCategoryRows } = await db.prepare(
        `SELECT project_categories.project_id, categories.id, categories.name
         FROM project_categories
         JOIN categories ON categories.id = project_categories.category_id
         WHERE project_categories.project_id IN (${placeholders})
         ORDER BY categories.name ASC`
    ).bind(...projectIds).all<ProjectCategoryRow>();

    const { results: projectSkillRows } = await db.prepare(
        `SELECT project_skills.project_id, skills.id AS skill_id, skills.name AS skill_name, skills.featured AS skill_featured
         FROM project_skills
         JOIN skills ON skills.id = project_skills.skill_id
         WHERE project_skills.project_id IN (${placeholders})
         ORDER BY skills.name ASC`
    ).bind(...projectIds).all<ProjectSkillRow>();

    const skillIds = [...new Set(projectSkillRows.map((row) => row.skill_id))];
    const skillCategoryRows = skillIds.length === 0
        ? []
        : (await db.prepare(
            `SELECT skill_categories.skill_id, categories.id, categories.name
             FROM skill_categories
             JOIN categories ON categories.id = skill_categories.category_id
             WHERE skill_categories.skill_id IN (${skillIds.map(() => '?').join(', ')})
             ORDER BY categories.name ASC`
        ).bind(...skillIds).all<SkillCategoryRow>()).results;

    const projectCategories = new Map<number, CategoryDto[]>();
    for (const row of projectCategoryRows) {
        const categories = projectCategories.get(row.project_id) ?? [];
        categories.push({ id: row.id, name: row.name });
        projectCategories.set(row.project_id, categories);
    }

    const skillCategories = new Map<number, CategoryDto[]>();
    for (const row of skillCategoryRows) {
        const categories = skillCategories.get(row.skill_id) ?? [];
        categories.push({ id: row.id, name: row.name });
        skillCategories.set(row.skill_id, categories);
    }

    const projectSkills = new Map<number, ProjectSkillDto[]>();
    for (const row of projectSkillRows) {
        const skills = projectSkills.get(row.project_id) ?? [];
        skills.push({
            id: row.skill_id,
            name: row.skill_name,
            categories: skillCategories.get(row.skill_id) ?? [],
            featured: Boolean(row.skill_featured),
        });
        projectSkills.set(row.project_id, skills);
    }

    return projects.map((project) => ({
        id: project.id,
        title: project.title,
        description: project.description,
        image_url: project.image_url ?? null,
        image_key: project.image_key ?? null,
        link: project.link,
        categories: projectCategories.get(project.id) ?? [],
        featured: project.featured,
        order_index: project.order_index,
        skills: projectSkills.get(project.id) ?? [],
    }));
}

export async function listProjectDtos(db: D1Database): Promise<ProjectDto[]> {
    const projects = await listProjectDtoRows(db);

    return projects.map((project) => ({
        id: project.id,
        title: project.title,
        description: project.description,
        image_url: project.image_url,
        link: project.link,
        categories: project.categories,
        featured: project.featured,
        order_index: project.order_index,
        skills: project.skills,
    }));
}

export async function listAdminProjectDtos(db: D1Database): Promise<AdminProjectDto[]> {
    return listProjectDtoRows(db);
}

export async function listProjects(db: D1Database): Promise<Project[]> {
    const { results } = await db.prepare('SELECT * FROM projects ORDER BY featured DESC, order_index ASC, created_at DESC').all<Project>();
    return results.map(normalizeProject);
}

export async function createProject(db: D1Database, projectData: Omit<Project, 'id' | 'created_at'>, categoryIds: number[]): Promise<Project> {
    return createProjectWithSkills(db, projectData, categoryIds, []);
}

export async function createProjectWithSkills(db: D1Database, projectData: Omit<Project, 'id' | 'created_at'>, categoryIds: number[], skillIds: number[]): Promise<Project> {
    const categories = await requireCategoriesByIds(db, categoryIds);
    const preparedProject = await prepareProjectCreate(db, projectData, categories);
    const { title, description, image_url, image_key, link, category, featured, order_index } = preparedProject;

    if (!title || !description || !link || !category || typeof featured !== 'boolean') {
        throw new MissingRequiredProjectFieldsError();
    }

    const id = createProjectId();
    const statements = [
        db.prepare('INSERT INTO projects (id, title, description, image_url, image_key, link, category, featured, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(id, title, description, image_url ?? null, image_key ?? null, link, category, featured, order_index),
        ...categoryAssignmentStatements(db, 'project_id', 'project_categories', id, categoryIds),
        ...projectSkillStatements(db, id, skillIds),
    ];

    await batchProjectWrite(db, statements);

    return { id, title, description, image_url: image_url ?? null, image_key: image_key ?? null, link, category, featured, order_index, created_at: new Date().toISOString() };
}

export async function getProjectById(db: D1Database, id: number): Promise<Project | null> {
    const project = await db.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first<Project>();
    return project ? normalizeProject(project) : null;
}

export async function updateProject(db: D1Database, id: number, projectData: Partial<Project>, categoryIds: number[] | null = null): Promise<Project> {
    return updateProjectWithSkills(db, id, projectData, categoryIds, null);
}

export async function updateProjectWithSkills(db: D1Database, id: number, projectData: Partial<Project>, categoryIds: number[] | null, skillIds: number[] | null): Promise<Project> {
    const existingProject = await getProjectById(db, id);

    if (!existingProject) {
        throw new ProjectNotFoundError();
    }

    const categories = categoryIds ? await requireCategoriesByIds(db, categoryIds) : null;
    const preparedProjectData = await prepareProjectUpdate(db, existingProject, projectData, categories);
    const { fields, values } = projectUpdateFields(preparedProjectData);

    if (fields.length === 0 && skillIds === null && categoryIds === null) {
        throw new NoFieldsToUpdateError();
    }

    const statements: D1PreparedStatement[] = [];

    if (fields.length > 0) {
        statements.push(db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).bind(...values, id));
    }

    if (categoryIds !== null) {
        statements.push(...categoryAssignmentStatements(db, 'project_id', 'project_categories', id, categoryIds));
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

    const result = await db.prepare('DELETE FROM projects WHERE id = ?').bind(id).run();

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
