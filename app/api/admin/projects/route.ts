import { getCloudflareContext } from '@opennextjs/cloudflare';
import {
    createProject,
    createProjectWithSkills,
    deleteProject,
    getProjectById,
    InvalidProjectFeaturedOrderStateError,
    listAdminProjectDtos,
    listProjectImages,
    NoFieldsToUpdateError,
    ProjectConflictError,
    ProjectNotFoundError,
    updateProject,
    updateProjectWithSkills,
} from '@/lib/server/projects';
import {
    CategoryNotFoundError,
    MissingRequiredCategoryFieldsError,
} from '@/lib/server/categories';
import { assertAdminMutation } from '@/lib/server/admin';
import { requireAdminUser } from '@/lib/server/auth';
import { HttpError, errorResponse, mapUnknownError, readJsonObject } from '@/lib/server/http';
import { deleteManagedR2Object, isManagedProjectImageKey, publicR2Url } from '@/lib/server/r2';
import { categoryIdsFromBody, idFromBody, parseCreateProject, parseProjectImages, parseUpdateProject, type ProjectImageInput } from '@/lib/server/validation';

function mapProjectError(error: unknown): Response | null {
    if (error instanceof MissingRequiredCategoryFieldsError || error instanceof CategoryNotFoundError) {
        return errorResponse(error.message, 400);
    }

    if (error instanceof NoFieldsToUpdateError) {
        return errorResponse('No fields to update', 400);
    }

    if (error instanceof ProjectNotFoundError) {
        return errorResponse('Project not found', 404);
    }

    if (error instanceof ProjectConflictError) {
        return errorResponse(error.message, 409);
    }

    if (error instanceof InvalidProjectFeaturedOrderStateError) {
        return errorResponse('Projects must either be featured and ordered, or non-featured and unordered', 400);
    }

    return null;
}

function applyManagedImageUrl<T extends { image_key?: string | null; image_url?: string | null }>(env: CloudflareEnv, data: T): T {
    if (isManagedProjectImageKey(data.image_key)) {
        return { ...data, image_url: publicR2Url(env, data.image_key) };
    }

    return data;
}

function applyManagedImageUrls(env: CloudflareEnv, images: ProjectImageInput[] | null): ProjectImageInput[] | null {
    if (images === null) {
        return null;
    }

    return images.map((image) => applyManagedImageUrl(env, image));
}

function normalizeManagedImagePayloadUrls(env: CloudflareEnv, value: unknown): unknown {
    if (!Array.isArray(value)) {
        return value;
    }

    return value.map((rawImage) => {
        if (typeof rawImage !== 'object' || rawImage === null || Array.isArray(rawImage)) {
            return rawImage;
        }

        const image = rawImage as Record<string, unknown>;
        const imageKey = typeof image.image_key === 'string' ? image.image_key : null;

        if (!isManagedProjectImageKey(imageKey)) {
            return rawImage;
        }

        return { ...image, image_url: publicR2Url(env, imageKey) };
    });
}

function managedKeys(values: Array<string | null | undefined>): Set<string> {
    return new Set(values.filter(isManagedProjectImageKey));
}

async function deleteRemovedManagedImages(env: CloudflareEnv, previousKeys: Set<string>, nextImages: ProjectImageInput[] | null, nextLegacyKey: string | null | undefined, previousLegacyKey: string | null | undefined): Promise<void> {
    if (nextImages === null) {
        if (nextLegacyKey !== undefined && previousLegacyKey !== nextLegacyKey) {
            await deleteManagedR2Object(env.BUCKET, previousLegacyKey);
        }
        return;
    }

    const nextKeys = managedKeys([
        ...nextImages.map((image) => image.image_key),
        nextLegacyKey,
    ]);

    await Promise.all([...previousKeys].filter((key) => !nextKeys.has(key)).map((key) => deleteManagedR2Object(env.BUCKET, key)));
}

function parseSkillIds(value: unknown): number[] | null {
    if (value === undefined) {
        return null;
    }

    if (!Array.isArray(value) || value.some((id) => !Number.isInteger(id) || id <= 0)) {
        throw new HttpError(400, 'Invalid skill_ids');
    }

    return value;
}

export async function POST(request: Request): Promise<Response> {
    const { env } = getCloudflareContext();

    try {
        await assertAdminMutation(request, env);
        const body = await readJsonObject(request);
        const skillIds = parseSkillIds(body.skill_ids) ?? [];
        const categoryIds = categoryIdsFromBody(body, true) ?? [];
        const images = applyManagedImageUrls(env, parseProjectImages(normalizeManagedImagePayloadUrls(env, body.images)));
        delete body.skill_ids;
        delete body.category_ids;
        delete body.images;
        const projectData = applyManagedImageUrl(env, parseCreateProject(body));
        const newProject = skillIds.length === 0
            ? await createProject(env.DB, projectData, categoryIds, images)
            : await createProjectWithSkills(env.DB, projectData, categoryIds, skillIds, images);

        return Response.json(newProject, { status: 201 });
    } catch (error) {
        const mapped = mapProjectError(error);
        return mapped ?? mapUnknownError(error, 'Failed to create project');
    }
}

export async function GET(request: Request): Promise<Response> {
    const { env } = getCloudflareContext();

    try {
        await requireAdminUser(request, env);
        const projects = await listAdminProjectDtos(env.DB);
        return Response.json(projects, { status: 200 });
    } catch (error) {
        return mapUnknownError(error, 'Failed to fetch admin projects');
    }
}

export async function PATCH(request: Request): Promise<Response> {
    const { env } = getCloudflareContext();

    try {
        await assertAdminMutation(request, env);
        const body = await readJsonObject(request);
        const id = idFromBody(body, 'project');
        const existingProject = await getProjectById(env.DB, id);

        if (!existingProject) {
            return errorResponse('Project not found', 404);
        }

        const existingImages = await listProjectImages(env.DB, id);
        const previousKeys = managedKeys([existingProject.image_key, ...existingImages.map((image) => image.image_key)]);
        const skillIds = parseSkillIds(body.skill_ids);
        const categoryIds = categoryIdsFromBody(body, false);
        const images = applyManagedImageUrls(env, parseProjectImages(normalizeManagedImagePayloadUrls(env, body.images)));
        delete body.skill_ids;
        delete body.category_ids;
        delete body.images;
        const projectData = applyManagedImageUrl(env, parseUpdateProject(body));
        const updatedProject = skillIds === null
            ? await updateProject(env.DB, id, projectData, categoryIds, images)
            : await updateProjectWithSkills(env.DB, id, projectData, categoryIds, skillIds, images);

        await deleteRemovedManagedImages(env, previousKeys, images, projectData.image_key, existingProject.image_key);

        return Response.json(updatedProject, { status: 200 });
    } catch (error) {
        const mapped = mapProjectError(error);
        return mapped ?? mapUnknownError(error, 'Failed to update project');
    }
}

export async function DELETE(request: Request): Promise<Response> {
    const { env } = getCloudflareContext();

    try {
        await assertAdminMutation(request, env);
        const body = await readJsonObject(request);
        const id = idFromBody(body, 'project');
        const existingProject = await getProjectById(env.DB, id);

        if (!existingProject) {
            return errorResponse('Project not found', 404);
        }

        const existingImages = await listProjectImages(env.DB, id);
        await Promise.all([...managedKeys([existingProject.image_key, ...existingImages.map((image) => image.image_key)])].map((key) => deleteManagedR2Object(env.BUCKET, key)));
        await deleteProject(env.DB, id);

        return Response.json({ message: 'Project deleted successfully' }, { status: 200 });
    } catch (error) {
        const mapped = mapProjectError(error);
        return mapped ?? mapUnknownError(error, 'Failed to delete project');
    }
}
