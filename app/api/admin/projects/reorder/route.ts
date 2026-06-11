import { getCloudflareContext } from '@opennextjs/cloudflare';
import { assertAdminMutation } from '@/lib/server/admin';
import { errorResponse, mapUnknownError, readJsonObject } from '@/lib/server/http';
import { InvalidProjectReorderError, ProjectConflictError, reorderFeaturedProjects } from '@/lib/server/projects';

function projectIdsFromBody(body: Record<string, unknown>): number[] {
    const projectIds = body.project_ids;

    if (!Array.isArray(projectIds)) {
        throw new InvalidProjectReorderError('Invalid project IDs');
    }

    return projectIds as number[];
}

function mapReorderError(error: unknown): Response | null {
    if (error instanceof InvalidProjectReorderError) {
        return errorResponse(error.message, 400);
    }

    if (error instanceof ProjectConflictError) {
        return errorResponse(error.message, 409);
    }

    return null;
}

export async function PATCH(request: Request): Promise<Response> {
    const { env } = getCloudflareContext();

    try {
        await assertAdminMutation(request, env);
        const body = await readJsonObject(request);
        await reorderFeaturedProjects(env.DB, projectIdsFromBody(body));
        return Response.json({ message: 'Project order updated successfully' }, { status: 200 });
    } catch (error) {
        const mapped = mapReorderError(error);
        return mapped ?? mapUnknownError(error, 'Failed to reorder projects');
    }
}
