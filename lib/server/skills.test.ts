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

    test('lists skills and public DTOs with category arrays', async () => {
        const skillsStatement = createMockStatement();
        skillsStatement.all.mockResolvedValue({ results: [existingSkill] });
        const categoriesStatement = createMockStatement();
        categoriesStatement.all.mockResolvedValue({ results: [
            { skill_id: 1, id: 10, name: 'Frontend' },
            { skill_id: 1, id: 11, name: 'UI' },
        ] });
        mock.prepare.mockReturnValueOnce(skillsStatement).mockReturnValueOnce(skillsStatement).mockReturnValueOnce(categoriesStatement);

        await expect(listSkills(mock.db)).resolves.toEqual([existingSkill]);
        await expect(listSkillDtos(mock.db)).resolves.toEqual([{ id: 1, name: 'React', icon_slug: null, icon: null, categories: [{ id: 10, name: 'Frontend' }, { id: 11, name: 'UI' }], featured: true }]);
        expect(mock.prepare).toHaveBeenCalledWith('SELECT * FROM skills ORDER BY featured DESC, name ASC');
    });

    test('creates a skill and category assignments in one batch', async () => {
        const categoriesStatement = createMockStatement();
        categoriesStatement.all.mockResolvedValue({ results: [{ id: 10, name: 'Language' }] });
        mock.prepare.mockReturnValue(categoriesStatement);
        mock.batch.mockResolvedValue([]);

        const skill = await createSkill(mock.db, { name: 'TypeScript', category: '', icon_slug: 'typescript', featured: true }, [10]);

        expect(mock.prepare).toHaveBeenCalledWith('INSERT INTO skills (id, name, category, icon_slug, featured) VALUES (?, ?, ?, ?, ?)');
        expect(mock.prepare).toHaveBeenCalledWith('INSERT INTO skill_categories (skill_id, category_id) VALUES (?, ?)');
        expect(mock.batch).toHaveBeenCalledTimes(1);
        expect(skill).toEqual({ id: expect.any(Number), name: 'TypeScript', category: 'Language', icon_slug: 'typescript', featured: true, created_at: expect.any(String) });
    });

    test('rejects missing required fields before writing', async () => {
        const categoriesStatement = createMockStatement();
        categoriesStatement.all.mockResolvedValue({ results: [{ id: 10, name: 'Language' }] });
        mock.prepare.mockReturnValue(categoriesStatement);

        await expect(createSkill(mock.db, { name: '', category: '', featured: true }, [10])).rejects.toBeInstanceOf(MissingRequiredSkillFieldsError);
        expect(mock.batch).not.toHaveBeenCalled();
    });

    test('updates fields and replaces categories', async () => {
        const updatedSkill = { ...existingSkill, name: 'React Updated', category: 'UI' };
        const getStatement = createMockStatement();
        getStatement.first.mockResolvedValueOnce(existingSkill);
        const categoriesStatement = createMockStatement();
        categoriesStatement.all.mockResolvedValue({ results: [{ id: 11, name: 'UI' }] });
        const updatedGetStatement = createMockStatement();
        updatedGetStatement.first.mockResolvedValueOnce(updatedSkill);
        mock.prepare
            .mockReturnValueOnce(getStatement)
            .mockReturnValueOnce(categoriesStatement)
            .mockReturnValueOnce(createMockStatement())
            .mockReturnValueOnce(createMockStatement())
            .mockReturnValueOnce(createMockStatement())
            .mockReturnValueOnce(updatedGetStatement)
            .mockImplementation(() => createMockStatement());
        mock.batch.mockResolvedValue([]);

        const result = await updateSkill(mock.db, 1, { name: 'React Updated', icon_slug: null }, [11]);

        expect(result).toEqual(updatedSkill);
        expect(mock.prepare).toHaveBeenCalledWith('UPDATE skills SET name = ?, category = ?, icon_slug = ? WHERE id = ?');
        expect(mock.prepare).toHaveBeenCalledWith('DELETE FROM skill_categories WHERE skill_id = ?');
        expect(mock.batch).toHaveBeenCalledTimes(1);
    });

    test('rejects missing skills and no-op updates', async () => {
        const missingStatement = createMockStatement();
        missingStatement.first.mockResolvedValue(undefined);
        mock.prepare.mockReturnValueOnce(missingStatement);
        await expect(updateSkill(mock.db, 999, { name: 'Missing' })).rejects.toBeInstanceOf(SkillNotFoundError);

        const existingStatement = createMockStatement();
        existingStatement.first.mockResolvedValue(existingSkill);
        mock.prepare.mockReturnValueOnce(existingStatement);
        await expect(updateSkill(mock.db, 1, { id: 1 })).rejects.toBeInstanceOf(NoFieldsToUpdateError);
    });

    test('deletes an existing skill and rejects missing deletes', async () => {
        const deleteStatement = createMockStatement();
        deleteStatement.run.mockResolvedValueOnce({ meta: { changes: 1 } }).mockResolvedValueOnce({ meta: { changes: 0 } });
        mock.prepare.mockReturnValue(deleteStatement);

        await expect(deleteSkill(mock.db, 1)).resolves.toBeUndefined();
        await expect(deleteSkill(mock.db, 999)).rejects.toBeInstanceOf(SkillNotFoundError);
    });
});
