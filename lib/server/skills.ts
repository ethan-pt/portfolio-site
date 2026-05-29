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

export async function listSkills(db: D1Database): Promise<Skill[]> {
    const { results } = await db.prepare(
        'SELECT * FROM skills ORDER BY featured DESC, category ASC, name ASC'
    ).all<Skill>();

    return results;
}

export async function createSkill(db: D1Database, skillData: Omit<Skill, 'id' | 'created_at'>): Promise<Skill> {
    const { name, category, featured } = skillData;

    if (!name || !category || typeof featured !== 'boolean') {
        throw new MissingRequiredSkillFieldsError();
    }

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
}

export async function getSkillById(db: D1Database, id: number): Promise<Skill | null> {
    const skill = await db.prepare(
        'SELECT * FROM skills WHERE id = ?'
    ).bind(id).first<Skill>();

    return skill ?? null;
}

export async function updateSkill(db: D1Database, id: number, skillData: Partial<Skill>): Promise<{ changes: number }> {
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

    const result = await db.prepare(
        `UPDATE skills SET ${fields.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    return { changes: result.meta.changes };
}

export async function deleteSkill(db: D1Database, id: number): Promise<void> {
    const result = await db.prepare(
        'DELETE FROM skills WHERE id = ?'
    ).bind(id).run();

    if (result.meta.changes === 0) {
        throw new SkillNotFoundError();
    }
}
