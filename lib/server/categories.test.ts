import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
    CategoryConflictError,
    CategoryInUseError,
    CategoryNotFoundError,
    createCategory,
    deleteCategory,
    listCategories,
    requireCategoriesByIds,
    updateCategory,
} from './categories';

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
    } as unknown as D1Database;

    return { db, prepare: db.prepare as ReturnType<typeof vi.fn> };
}

describe('category data access', () => {
    let mock: ReturnType<typeof createMockDb>;

    beforeEach(() => {
        mock = createMockDb();
    });

    test('lists categories alphabetically', async () => {
        const statement = createMockStatement();
        statement.all.mockResolvedValue({ results: [{ id: 1, name: 'Back-End' }] });
        mock.prepare.mockReturnValueOnce(statement);

        await expect(listCategories(mock.db)).resolves.toEqual([{ id: 1, name: 'Back-End' }]);
        expect(mock.prepare).toHaveBeenCalledWith('SELECT id, name FROM categories ORDER BY name ASC');
    });

    test('requires every submitted category id to exist', async () => {
        const statement = createMockStatement();
        statement.all.mockResolvedValue({ results: [{ id: 1, name: 'Back-End' }] });
        mock.prepare.mockReturnValueOnce(statement);

        await expect(requireCategoriesByIds(mock.db, [1, 2])).rejects.toBeInstanceOf(CategoryNotFoundError);
    });

    test('normalizes names when creating and updating', async () => {
        const createStatement = createMockStatement();
        createStatement.run.mockResolvedValue({ meta: { last_row_id: 7 } });
        const updateStatement = createMockStatement();
        updateStatement.run.mockResolvedValue({ meta: { changes: 1 } });
        mock.prepare.mockReturnValueOnce(createStatement).mockReturnValueOnce(updateStatement);

        await expect(createCategory(mock.db, '  Cloud   Platform  ')).resolves.toEqual({ id: 7, name: 'Cloud Platform' });
        await expect(updateCategory(mock.db, 7, '  DevOps  ')).resolves.toEqual({ id: 7, name: 'DevOps' });
        expect(createStatement.bind).toHaveBeenCalledWith('Cloud Platform');
        expect(updateStatement.bind).toHaveBeenCalledWith('DevOps', 7);
    });

    test('maps unique constraint failures to category conflicts', async () => {
        const statement = createMockStatement();
        statement.run.mockRejectedValue(new Error('UNIQUE constraint failed: categories.name'));
        mock.prepare.mockReturnValueOnce(statement);

        await expect(createCategory(mock.db, 'DevOps')).rejects.toBeInstanceOf(CategoryConflictError);
    });

    test('blocks deleting categories that are still assigned', async () => {
        const usageStatement = createMockStatement();
        usageStatement.first.mockResolvedValue({ project_count: 1, skill_count: 0 });
        mock.prepare.mockReturnValueOnce(usageStatement);

        await expect(deleteCategory(mock.db, 1)).rejects.toBeInstanceOf(CategoryInUseError);
    });

    test('deletes unused categories and rejects missing ids', async () => {
        const usageStatement = createMockStatement();
        usageStatement.first.mockResolvedValue({ project_count: 0, skill_count: 0 });
        const deleteStatement = createMockStatement();
        deleteStatement.run.mockResolvedValueOnce({ meta: { changes: 1 } }).mockResolvedValueOnce({ meta: { changes: 0 } });
        mock.prepare.mockReturnValueOnce(usageStatement).mockReturnValue(deleteStatement);

        await expect(deleteCategory(mock.db, 1)).resolves.toBeUndefined();
        await expect(deleteCategory(mock.db, 2)).rejects.toBeInstanceOf(CategoryNotFoundError);
    });
});
