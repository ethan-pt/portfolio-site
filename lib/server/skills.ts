import type { SkillDto } from '@/types/api';
import type { Skill } from '@/types/db';

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

function normalizeSkill(skill: Skill): Skill {
    return {
        ...skill,
        featured: Boolean(skill.featured),
    };
}

function isConflictError(error: unknown): boolean {
    return error instanceof Error && /unique|constraint/i.test(error.message);
}

export async function listSkillDtos(db: D1Database): Promise<SkillDto[]> {
    const skills = await listSkills(db);

    return skills.map((skill) => ({
        id: skill.id,
        name: skill.name,
        category: skill.category,
        featured: skill.featured,
    }));
}

export async function listSkills(db: D1Database): Promise<Skill[]> {
    const { results } = await db.prepare(
        'SELECT * FROM skills ORDER BY featured DESC, category ASC, name ASC'
    ).all<Skill>();

    return results.map(normalizeSkill);
}

export async function createSkill(db: D1Database, skillData: Omit<Skill, 'id' | 'created_at'>): Promise<Skill> {
    const { name, category, featured } = skillData;

    if (!name || !category || typeof featured !== 'boolean') {
        throw new MissingRequiredSkillFieldsError();
    }

    try {
        const result = await db.prepare(
            'INSERT INTO skills (name, category, featured) VALUES (?, ?, ?)'
        ).bind(name, category, featured).run();

        return {
            id: result.meta.last_row_id,
            name,
            category,
            featured,
            created_at: new Date().toISOString(),
        };
    } catch (error) {
        if (isConflictError(error)) {
            throw new SkillConflictError();
        }
        throw error;
    }
}

export async function getSkillById(db: D1Database, id: number): Promise<Skill | null> {
    const skill = await db.prepare(
        'SELECT * FROM skills WHERE id = ?'
    ).bind(id).first<Skill>();

    return skill ? normalizeSkill(skill) : null;
}

export async function updateSkill(db: D1Database, id: number, skillData: Partial<Skill>): Promise<Skill> {
    const existingSkill = await getSkillById(db, id);

    if (!existingSkill) {
        throw new SkillNotFoundError();
    }

    const updates: Partial<Omit<Skill, 'id' | 'created_at'>> = {
        name: skillData.name,
        category: skillData.category,
        featured: skillData.featured,
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

    try {
        await db.prepare(
            `UPDATE skills SET ${fields.join(', ')} WHERE id = ?`
        ).bind(...values).run();
    } catch (error) {
        if (isConflictError(error)) {
            throw new SkillConflictError();
        }
        throw error;
    }

    const updatedSkill = await getSkillById(db, id);

    if (!updatedSkill) {
        throw new SkillNotFoundError();
    }

    return updatedSkill;
}

export async function deleteSkill(db: D1Database, id: number): Promise<void> {
    const result = await db.prepare(
        'DELETE FROM skills WHERE id = ?'
    ).bind(id).run();

    if (result.meta.changes === 0) {
        throw new SkillNotFoundError();
    }
}
