import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { Skill } from '@/types/db';
import {
    listSkills,
    createSkill,
    updateSkill,
    deleteSkill,
    NoFieldsToUpdateError,
    MissingRequiredSkillFieldsError,
    SkillNotFoundError,
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

    describe('listSkills', () => {
        test('selects skills in display order', async () => {
            mock.statement.all.mockResolvedValue({ results: [existingSkill] });

            const skills = await listSkills(mock.db);

            expect(skills).toEqual([existingSkill]);
            expect(mock.prepare).toHaveBeenCalledWith(
                'SELECT * FROM skills ORDER BY featured DESC, category ASC, name ASC'
            );
        });
    });

    describe('createSkill', () => {
        const skillData = {
            name: 'TypeScript',
            category: 'Language',
            featured: true,
        };

        test('inserts a skill and returns the created shape', async () => {
            mock.statement.run.mockResolvedValue({ meta: { last_row_id: 7 } });

            const skill = await createSkill(mock.db, skillData);

            expect(mock.prepare).toHaveBeenCalledWith(
                'INSERT INTO skills (name, category, featured) VALUES (?, ?, ?)'
            );
            expect(mock.statement.bind).toHaveBeenCalledWith(
                skillData.name,
                skillData.category,
                skillData.featured
            );
            expect(mock.statement.run).toHaveBeenCalledWith();
            expect(skill).toEqual({
                id: 7,
                ...skillData,
                created_at: expect.any(String),
            });
        });

        test('rejects missing required fields before inserting', async () => {
            await expect(createSkill(mock.db, {
                ...skillData,
                name: '',
            })).rejects.toBeInstanceOf(MissingRequiredSkillFieldsError);

            await expect(createSkill(mock.db, {
                ...skillData,
                featured: undefined as unknown as boolean,
            })).rejects.toBeInstanceOf(MissingRequiredSkillFieldsError);

            expect(mock.statement.run).not.toHaveBeenCalled();
        });
    });

    describe('updateSkill', () => {
        test('updates only allowed defined fields', async () => {
            mock.statement.first.mockResolvedValue(existingSkill);
            mock.statement.run.mockResolvedValue({ meta: { changes: 1 } });

            const result = await updateSkill(mock.db, 1, {
                id: 99,
                name: 'React Updated',
                category: undefined,
                created_at: '2024-01-01T00:00:00Z',
            });

            expect(result).toEqual({ changes: 1 });
            expect(mock.statement.bind).toHaveBeenCalledWith('React Updated', 1);
            expect(mock.statement.run).toHaveBeenCalledWith();
            expect(mock.prepare).toHaveBeenLastCalledWith('UPDATE skills SET name = ? WHERE id = ?');
        });

        test('rejects updates for missing skills', async () => {
            mock.statement.first.mockResolvedValue(undefined);

            await expect(updateSkill(mock.db, 999, { name: 'Missing' })).rejects.toBeInstanceOf(SkillNotFoundError);
            expect(mock.statement.run).not.toHaveBeenCalled();
        });

        test('rejects requests with no fields to update', async () => {
            mock.statement.first.mockResolvedValue(existingSkill);

            await expect(updateSkill(mock.db, 1, { id: 1 })).rejects.toBeInstanceOf(NoFieldsToUpdateError);
            expect(mock.statement.run).not.toHaveBeenCalled();
        });
    });

    describe('deleteSkill', () => {
        test('deletes an existing skill', async () => {
            mock.statement.run.mockResolvedValue({ meta: { changes: 1 } });

            await expect(deleteSkill(mock.db, 1)).resolves.toBeUndefined();

            expect(mock.prepare).toHaveBeenCalledWith('DELETE FROM skills WHERE id = ?');
            expect(mock.statement.bind).toHaveBeenCalledWith(1);
            expect(mock.statement.run).toHaveBeenCalledWith();
        });

        test('rejects when no skill was deleted', async () => {
            mock.statement.run.mockResolvedValue({ meta: { changes: 0 } });

            await expect(deleteSkill(mock.db, 999)).rejects.toBeInstanceOf(SkillNotFoundError);
        });
    });
});
