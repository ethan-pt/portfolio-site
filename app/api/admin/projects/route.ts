import { getCloudflareContext } from '@opennextjs/cloudflare';
import {
    createProject,
    createProjectWithSkills,
    deleteProject,
    getProjectById,
    InvalidProjectFeaturedOrderStateError,
    NoFieldsToUpdateError,
    ProjectConflictError,
    ProjectNotFoundError,
    updateProject,
    updateProjectWithSkills,
} from '@/lib/server/projects';
import { assertAdminMutation } from '@/lib/server/admin';
import { HttpError, errorResponse, mapUnknownError, readJsonObject } from '@/lib/server/http';
import { deleteManagedR2Object, isManagedProjectImageKey, publicR2Url } from '@/lib/server/r2';
import { idFromBody, parseCreateProject, parseUpdateProject } from '@/lib/server/validation';

function mapProjectError(error: unknown): Response | null {
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
        const skillIds = parseSkillIds(body.skill_ids);
        delete body.skill_ids;
        const projectData = applyManagedImageUrl(env, parseCreateProject(body));
        const newProject = skillIds === null
            ? await createProject(env.DB, projectData)
            : await createProjectWithSkills(env.DB, projectData, skillIds);

        return Response.json(newProject, { status: 201 });
    } catch (error) {
        const mapped = mapProjectError(error);
        return mapped ?? mapUnknownError(error, 'Failed to create project');
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
        delete body.skill_ids;
        const projectData = applyManagedImageUrl(env, parseUpdateProject(body));
        const updatedProject = skillIds === null
            ? await updateProject(env.DB, id, projectData)
            : await updateProjectWithSkills(env.DB, id, projectData, skillIds);

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
