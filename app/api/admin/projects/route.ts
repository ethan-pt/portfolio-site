import { getCloudflareContext } from '@opennextjs/cloudflare';
import {
    createProject,
    createProjectWithSkills,
    deleteProject,
    getProjectById,
    InvalidProjectFeaturedOrderStateError,
    listAdminProjectDtos,
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
import { categoryIdsFromBody, idFromBody, parseCreateProject, parseUpdateProject } from '@/lib/server/validation';

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
        delete body.skill_ids;
        delete body.category_ids;
        const projectData = applyManagedImageUrl(env, parseCreateProject(body));
        const newProject = skillIds.length === 0
            ? await createProject(env.DB, projectData, categoryIds)
            : await createProjectWithSkills(env.DB, projectData, categoryIds, skillIds);

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

        const skillIds = parseSkillIds(body.skill_ids);
        const categoryIds = categoryIdsFromBody(body, false);
        delete body.skill_ids;
        delete body.category_ids;
        const projectData = applyManagedImageUrl(env, parseUpdateProject(body));
        const updatedProject = skillIds === null
            ? await updateProject(env.DB, id, projectData, categoryIds)
            : await updateProjectWithSkills(env.DB, id, projectData, categoryIds, skillIds);

        if (projectData.image_key !== undefined && existingProject.image_key !== projectData.image_key) {
            await deleteManagedR2Object(env.BUCKET, existingProject.image_key);
        }

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

        await deleteManagedR2Object(env.BUCKET, existingProject.image_key);
        await deleteProject(env.DB, id);

        return Response.json({ message: 'Project deleted successfully' }, { status: 200 });
    } catch (error) {
        const mapped = mapProjectError(error);
        return mapped ?? mapUnknownError(error, 'Failed to delete project');
    }
}
