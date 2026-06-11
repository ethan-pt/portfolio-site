import { getCloudflareContext } from '@opennextjs/cloudflare';
import { assertAdminMutation } from '@/lib/server/admin';
import { requireAdminUser } from '@/lib/server/auth';
import {
    CategoryConflictError,
    CategoryInUseError,
    CategoryNotFoundError,
    createCategory,
    deleteCategory,
    listCategories,
    MissingRequiredCategoryFieldsError,
    updateCategory,
} from '@/lib/server/categories';
import { errorResponse, mapUnknownError, readJsonObject } from '@/lib/server/http';
import { idFromBody, parseCategoryName } from '@/lib/server/validation';

function mapCategoryError(error: unknown): Response | null {
    if (error instanceof MissingRequiredCategoryFieldsError) {
        return errorResponse('Category name is required', 400);
    }

    if (error instanceof CategoryNotFoundError) {
        return errorResponse('Category not found', 404);
    }

    if (error instanceof CategoryConflictError) {
        return errorResponse('Category already exists', 409);
    }

    if (error instanceof CategoryInUseError) {
        return errorResponse('Category is still assigned to a project or skill', 409);
    }

    return null;
}

export async function GET(request: Request): Promise<Response> {
    const { env } = getCloudflareContext();

    try {
        await requireAdminUser(request, env);
        return Response.json(await listCategories(env.DB), { status: 200 });
    } catch (error) {
        return mapUnknownError(error, 'Failed to fetch categories');
    }
}

export async function POST(request: Request): Promise<Response> {
    const { env } = getCloudflareContext();

    try {
        await assertAdminMutation(request, env);
        const body = await readJsonObject(request);
        const category = await createCategory(env.DB, parseCategoryName(body));
        return Response.json(category, { status: 201 });
    } catch (error) {
        const mapped = mapCategoryError(error);
        return mapped ?? mapUnknownError(error, 'Failed to create category');
    }
}

export async function PATCH(request: Request): Promise<Response> {
    const { env } = getCloudflareContext();

    try {
        await assertAdminMutation(request, env);
        const body = await readJsonObject(request);
        const id = idFromBody(body, 'category');
        delete body.id;
        const category = await updateCategory(env.DB, id, parseCategoryName(body));
        return Response.json(category, { status: 200 });
    } catch (error) {
        const mapped = mapCategoryError(error);
        return mapped ?? mapUnknownError(error, 'Failed to update category');
    }
}

export async function DELETE(request: Request): Promise<Response> {
    const { env } = getCloudflareContext();

    try {
        await assertAdminMutation(request, env);
        const body = await readJsonObject(request);
        await deleteCategory(env.DB, idFromBody(body, 'category'));
        return Response.json({ message: 'Category deleted successfully' }, { status: 200 });
    } catch (error) {
        const mapped = mapCategoryError(error);
        return mapped ?? mapUnknownError(error, 'Failed to delete category');
    }
}
