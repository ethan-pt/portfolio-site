import type { CategoryDto, SkillDto } from '@/types/api';
import type { Skill } from '@/types/db';
import { categoryAssignmentStatements, requireCategoriesByIds } from './categories';

export class SkillNotFoundError extends Error {
    constructor(message = 'Skill not found') {
        super(message);
        this.name = 'SkillNotFoundError';
    }
}

export class NoFieldsToUpdateError extends Error {
    constructor(message = 'No fields to update') {
        super(message);
        this.name = 'NoFieldsToUpdateError';
    }
}

export class MissingRequiredSkillFieldsError extends Error {
    constructor(message = 'Missing required fields') {
        super(message);
        this.name = 'MissingRequiredSkillFieldsError';
    }
}

export class SkillConflictError extends Error {
    constructor(message = 'Skill conflicts with an existing record') {
        super(message);
        this.name = 'SkillConflictError';
    }
}

interface SkillCategoryRow {
    skill_id: number;
    id: number;
    name: string;
}

function normalizeSkill(skill: Skill): Skill {
    return {
        ...skill,
        featured: Boolean(skill.featured),
    };
}

function isConflictError(error: unknown): boolean {
    return error instanceof Error && /unique|constraint/i.test(error.message);
}

function createSkillId(): number {
    const bytes = new Uint32Array(1);
    crypto.getRandomValues(bytes);
    return bytes[0] || createSkillId();
}

async function batchSkillWrite(db: D1Database, statements: D1PreparedStatement[]): Promise<void> {
    if (statements.length === 0) return;

    try {
        await db.batch(statements);
    } catch (error) {
        if (isConflictError(error)) {
            throw new SkillConflictError();
        }
        throw error;
    }
}

export async function listSkillDtos(db: D1Database): Promise<SkillDto[]> {
    const skills = await listSkills(db);

    if (skills.length === 0) {
        return [];
    }

    const skillIds = skills.map((skill) => skill.id);
    const { results: categoryRows } = await db.prepare(
        `SELECT skill_categories.skill_id, categories.id, categories.name
         FROM skill_categories
         JOIN categories ON categories.id = skill_categories.category_id
         WHERE skill_categories.skill_id IN (${skillIds.map(() => '?').join(', ')})
         ORDER BY categories.name ASC`
    ).bind(...skillIds).all<SkillCategoryRow>();

    const categoryMap = new Map<number, CategoryDto[]>();
    for (const row of categoryRows) {
        const categories = categoryMap.get(row.skill_id) ?? [];
        categories.push({ id: row.id, name: row.name });
        categoryMap.set(row.skill_id, categories);
    }

    return skills.map((skill) => ({
        id: skill.id,
        name: skill.name,
        categories: categoryMap.get(skill.id) ?? [],
        featured: skill.featured,
    }));
}

export async function listSkills(db: D1Database): Promise<Skill[]> {
    const { results } = await db.prepare(
        'SELECT * FROM skills ORDER BY featured DESC, name ASC'
    ).all<Skill>();

    return results.map(normalizeSkill);
}

export async function createSkill(db: D1Database, skillData: Omit<Skill, 'id' | 'created_at'>, categoryIds: number[]): Promise<Skill> {
    const categories = await requireCategoriesByIds(db, categoryIds);
    const { name, featured } = skillData;
    const category = categories[0]?.name ?? '';

    if (!name || !category || typeof featured !== 'boolean') {
        throw new MissingRequiredSkillFieldsError();
    }

    const id = createSkillId();
    await batchSkillWrite(db, [
        db.prepare('INSERT INTO skills (id, name, category, featured) VALUES (?, ?, ?, ?)').bind(id, name, category, featured),
        ...categoryAssignmentStatements(db, 'skill_id', 'skill_categories', id, categoryIds),
    ]);

    return { id, name, category, featured, created_at: new Date().toISOString() };
}

export async function getSkillById(db: D1Database, id: number): Promise<Skill | null> {
    const skill = await db.prepare('SELECT * FROM skills WHERE id = ?').bind(id).first<Skill>();
    return skill ? normalizeSkill(skill) : null;
}

export async function updateSkill(db: D1Database, id: number, skillData: Partial<Skill>, categoryIds: number[] | null = null): Promise<Skill> {
    const existingSkill = await getSkillById(db, id);

    if (!existingSkill) {
        throw new SkillNotFoundError();
    }

    const categories = categoryIds ? await requireCategoriesByIds(db, categoryIds) : null;
    const updates: Partial<Omit<Skill, 'id' | 'created_at'>> = {
        name: skillData.name,
        category: categories ? categories[0]?.name : skillData.category,
        featured: skillData.featured,
    };

    const fields: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(updates)) {
        if (value === undefined) continue;
        fields.push(`${key} = ?`);
        values.push(value);
    }

    if (fields.length === 0 && categoryIds === null) {
        throw new NoFieldsToUpdateError();
    }

    const statements: D1PreparedStatement[] = [];

    if (fields.length > 0) {
        statements.push(db.prepare(`UPDATE skills SET ${fields.join(', ')} WHERE id = ?`).bind(...values, id));
    }

    if (categoryIds !== null) {
        statements.push(...categoryAssignmentStatements(db, 'skill_id', 'skill_categories', id, categoryIds));
    }

    await batchSkillWrite(db, statements);

    const updatedSkill = await getSkillById(db, id);

    if (!updatedSkill) {
        throw new SkillNotFoundError();
    }

    return updatedSkill;
}

export async function deleteSkill(db: D1Database, id: number): Promise<void> {
    const result = await db.prepare('DELETE FROM skills WHERE id = ?').bind(id).run();

    if (result.meta.changes === 0) {
        throw new SkillNotFoundError();
    }
}
