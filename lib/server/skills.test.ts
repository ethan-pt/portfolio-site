import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Skill } from '@/types/db';
import {
    MissingRequiredSkillFieldsError,
    NoFieldsToUpdateError,
    SkillNotFoundError,
    createSkill,
    deleteSkill,
    listSkillDtos,
    listSkills,
    updateSkill,
} from './skills';

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

describe('skill data access', () => {
    let mock: ReturnType<typeof createMockDb>;

    const existingSkill: Skill = {
        id: 1,
        name: 'React',
        category: 'Frontend',
        featured: true,
        created_at: '2023-01-01T00:00:00Z',
    };

    beforeEach(() => {
        mock = createMockDb();
    });

    test('lists admin skills and public DTOs in display order', async () => {
        mock.statement.all.mockResolvedValue({ results: [existingSkill] });

        await expect(listSkills(mock.db)).resolves.toEqual([existingSkill]);
        await expect(listSkillDtos(mock.db)).resolves.toEqual([{ id: 1, name: 'React', category: 'Frontend', featured: true }]);
        expect(mock.prepare).toHaveBeenCalledWith('SELECT * FROM skills ORDER BY featured DESC, category ASC, name ASC');
    });

    test('inserts a skill and returns the created shape', async () => {
        const skillData = { name: 'TypeScript', category: 'Language', featured: true };
        mock.statement.run.mockResolvedValue({ meta: { last_row_id: 7 } });

        const skill = await createSkill(mock.db, skillData);

        expect(mock.prepare).toHaveBeenCalledWith('INSERT INTO skills (name, category, featured) VALUES (?, ?, ?)');
        expect(mock.statement.bind).toHaveBeenCalledWith(skillData.name, skillData.category, skillData.featured);
        expect(skill).toEqual({ id: 7, ...skillData, created_at: expect.any(String) });
    });

    test('rejects missing required fields before inserting', async () => {
        await expect(createSkill(mock.db, { name: '', category: 'Language', featured: true })).rejects.toBeInstanceOf(MissingRequiredSkillFieldsError);
        expect(mock.statement.run).not.toHaveBeenCalled();
    });

    test('updates allowed fields and returns the updated skill', async () => {
        const updatedSkill = { ...existingSkill, name: 'React Updated' };
        mock.statement.first.mockResolvedValueOnce(existingSkill).mockResolvedValueOnce(updatedSkill);
        mock.statement.run.mockResolvedValue({ meta: { changes: 1 } });

        const result = await updateSkill(mock.db, 1, {
            id: 99,
            name: 'React Updated',
            category: undefined,
            created_at: '2024-01-01T00:00:00Z',
        });

        expect(result).toEqual(updatedSkill);
        expect(mock.statement.bind).toHaveBeenCalledWith('React Updated', 1);
        expect(mock.prepare).toHaveBeenCalledWith('UPDATE skills SET name = ? WHERE id = ?');
    });

    test('rejects missing skills and no-op updates', async () => {
        mock.statement.first.mockResolvedValue(undefined);
        await expect(updateSkill(mock.db, 999, { name: 'Missing' })).rejects.toBeInstanceOf(SkillNotFoundError);

        mock.statement.first.mockResolvedValue(existingSkill);
        await expect(updateSkill(mock.db, 1, { id: 1 })).rejects.toBeInstanceOf(NoFieldsToUpdateError);
    });

    test('deletes an existing skill and rejects missing deletes', async () => {
        mock.statement.run.mockResolvedValueOnce({ meta: { changes: 1 } }).mockResolvedValueOnce({ meta: { changes: 0 } });

        await expect(deleteSkill(mock.db, 1)).resolves.toBeUndefined();
        await expect(deleteSkill(mock.db, 999)).rejects.toBeInstanceOf(SkillNotFoundError);
    });
});
