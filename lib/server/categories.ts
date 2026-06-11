import type { CategoryDto } from '@/types/api';

export class CategoryNotFoundError extends Error {
    constructor(message = 'Category not found') {
        super(message);
        this.name = 'CategoryNotFoundError';
    }
}

export class CategoryConflictError extends Error {
    constructor(message = 'Category conflicts with an existing record') {
        super(message);
        this.name = 'CategoryConflictError';
    }
}

export class MissingRequiredCategoryFieldsError extends Error {
    constructor(message = 'Missing required fields') {
        super(message);
        this.name = 'MissingRequiredCategoryFieldsError';
    }
}

export class CategoryInUseError extends Error {
    constructor(message = 'Category is in use') {
        super(message);
        this.name = 'CategoryInUseError';
    }
}

function isConflictError(error: unknown): boolean {
    return error instanceof Error && /unique|constraint/i.test(error.message);
}

function normalizeName(name: string): string {
    return name.trim().replace(/\s+/g, ' ');
}

export async function listCategories(db: D1Database): Promise<CategoryDto[]> {
    const { results } = await db.prepare(
        'SELECT id, name FROM categories ORDER BY name ASC'
    ).all<CategoryDto>();

    return results;
}

export async function getCategoriesByIds(db: D1Database, categoryIds: number[]): Promise<CategoryDto[]> {
    const uniqueIds = [...new Set(categoryIds)];

    if (uniqueIds.length === 0) {
        return [];
    }

    const placeholders = uniqueIds.map(() => '?').join(', ');
    const { results } = await db.prepare(
        `SELECT id, name FROM categories WHERE id IN (${placeholders}) ORDER BY name ASC`
    ).bind(...uniqueIds).all<CategoryDto>();

    return results;
}

export async function requireCategoriesByIds(db: D1Database, categoryIds: number[]): Promise<CategoryDto[]> {
    const uniqueIds = [...new Set(categoryIds)];

    if (uniqueIds.length === 0) {
        throw new MissingRequiredCategoryFieldsError('At least one category is required');
    }

    const categories = await getCategoriesByIds(db, uniqueIds);

    if (categories.length !== uniqueIds.length) {
        throw new CategoryNotFoundError('One or more categories were not found');
    }

    return categories;
}

export async function createCategory(db: D1Database, name: string): Promise<CategoryDto> {
    const normalizedName = normalizeName(name);

    if (!normalizedName) {
        throw new MissingRequiredCategoryFieldsError();
    }

    try {
        const result = await db.prepare(
            'INSERT INTO categories (name) VALUES (?)'
        ).bind(normalizedName).run();

        return { id: result.meta.last_row_id, name: normalizedName };
    } catch (error) {
        if (isConflictError(error)) {
            throw new CategoryConflictError();
        }
        throw error;
    }
}

export async function updateCategory(db: D1Database, id: number, name: string): Promise<CategoryDto> {
    const normalizedName = normalizeName(name);

    if (!normalizedName) {
        throw new MissingRequiredCategoryFieldsError();
    }

    try {
        const result = await db.prepare(
            'UPDATE categories SET name = ? WHERE id = ?'
        ).bind(normalizedName, id).run();

        if (result.meta.changes === 0) {
            throw new CategoryNotFoundError();
        }

        return { id, name: normalizedName };
    } catch (error) {
        if (isConflictError(error)) {
            throw new CategoryConflictError();
        }
        throw error;
    }
}

export async function deleteCategory(db: D1Database, id: number): Promise<void> {
    const usage = await db.prepare(
        `SELECT
            (SELECT COUNT(*) FROM project_categories WHERE category_id = ?) AS project_count,
            (SELECT COUNT(*) FROM skill_categories WHERE category_id = ?) AS skill_count`
    ).bind(id, id).first<{ project_count: number; skill_count: number }>();

    if ((usage?.project_count ?? 0) > 0 || (usage?.skill_count ?? 0) > 0) {
        throw new CategoryInUseError();
    }

    const result = await db.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();

    if (result.meta.changes === 0) {
        throw new CategoryNotFoundError();
    }
}

export function categoryAssignmentStatements(db: D1Database, ownerColumn: 'project_id' | 'skill_id', tableName: 'project_categories' | 'skill_categories', ownerId: number, categoryIds: number[]): D1PreparedStatement[] {
    const uniqueIds = [...new Set(categoryIds)];

    return [
        db.prepare(`DELETE FROM ${tableName} WHERE ${ownerColumn} = ?`).bind(ownerId),
        ...uniqueIds.map((categoryId) => (
            db.prepare(`INSERT INTO ${tableName} (${ownerColumn}, category_id) VALUES (?, ?)`).bind(ownerId, categoryId)
        )),
    ];
}
