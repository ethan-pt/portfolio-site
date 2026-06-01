import { getCloudflareContext } from '@opennextjs/cloudflare';
import { replaceProjectSkills, ProjectConflictError, ProjectNotFoundError } from '@/lib/server/projects';
import { requireAdminUser } from '@/lib/server/auth';
import { assertAdminMutation } from '@/lib/server/admin';
import { assertSameOrigin, errorResponse, HttpError, mapUnknownError, readJsonObject } from '@/lib/server/http';

function projectIdFromRequest(request: Request): number {
    const parts = new URL(request.url).pathname.split('/');
    const skillsIndex = parts.lastIndexOf('skills');
    const id = Number(parts[skillsIndex - 1]);

    if (!Number.isInteger(id) || id <= 0) {
        throw new HttpError(400, 'Missing project ID');
    }

    return id;
}

function parseSkillIds(value: unknown): number[] {
    if (!Array.isArray(value) || value.some((id) => typeof id !== 'number' || !Number.isInteger(id) || id <= 0)) {
        throw new HttpError(400, 'Invalid skill_ids');
    }

    return value;
}

function mapRelationshipError(error: unknown): Response | null {
    if (error instanceof ProjectNotFoundError) {
        return errorResponse('Project not found', 404);
    }

    if (error instanceof ProjectConflictError) {
        return errorResponse(error.message, 409);
    }

    return null;
}

export async function PUT(request: Request): Promise<Response> {
    const { env } = getCloudflareContext();

    try {
        await assertAdminMutation(request, env);
        const projectId = projectIdFromRequest(request);
        const body = await readJsonObject(request);
        await replaceProjectSkills(env.DB, projectId, parseSkillIds(body.skill_ids));
        return Response.json({ message: 'Project skills updated successfully' }, { status: 200 });
    } catch (error) {
        const mapped = mapRelationshipError(error);
        return mapped ?? mapUnknownError(error, 'Failed to update project skills');
    }
}

export async function DELETE(request: Request): Promise<Response> {
    const { env } = getCloudflareContext();

    try {
        await requireAdminUser(request, env);

        if (!env.SITE_ORIGIN) {
            throw new HttpError(500, 'Missing SITE_ORIGIN');
        }

        assertSameOrigin(request, env.SITE_ORIGIN);
        const projectId = projectIdFromRequest(request);
        await replaceProjectSkills(env.DB, projectId, []);
        return Response.json({ message: 'Project skills cleared successfully' }, { status: 200 });
    } catch (error) {
        const mapped = mapRelationshipError(error);
        return mapped ?? mapUnknownError(error, 'Failed to clear project skills');
    }
}
