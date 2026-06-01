import { getCloudflareContext } from '@opennextjs/cloudflare';
import {
    createSkill,
    deleteSkill,
    NoFieldsToUpdateError,
    SkillConflictError,
    SkillNotFoundError,
    updateSkill,
} from '@/lib/server/skills';
import { assertAdminMutation } from '@/lib/server/admin';
import { errorResponse, mapUnknownError, readJsonObject } from '@/lib/server/http';
import { idFromBody, parseCreateSkill, parseUpdateSkill } from '@/lib/server/validation';

function mapSkillError(error: unknown): Response | null {
    if (error instanceof NoFieldsToUpdateError) {
        return errorResponse('No fields to update', 400);
    }

    if (error instanceof SkillNotFoundError) {
        return errorResponse('Skill not found', 404);
    }

    if (error instanceof SkillConflictError) {
        return errorResponse(error.message, 409);
    }

    return null;
}

export async function POST(request: Request): Promise<Response> {
    const { env } = getCloudflareContext();

    try {
        await assertAdminMutation(request, env);
        const body = await readJsonObject(request);
        const newSkill = await createSkill(env.DB, parseCreateSkill(body));
        return Response.json(newSkill, { status: 201 });
    } catch (error) {
        const mapped = mapSkillError(error);
        return mapped ?? mapUnknownError(error, 'Failed to create skill');
    }
}

export async function PATCH(request: Request): Promise<Response> {
    const { env } = getCloudflareContext();

    try {
        await assertAdminMutation(request, env);
        const body = await readJsonObject(request);
        const id = idFromBody(body, 'skill');
        const updatedSkill = await updateSkill(env.DB, id, parseUpdateSkill(body));
        return Response.json(updatedSkill, { status: 200 });
    } catch (error) {
        const mapped = mapSkillError(error);
        return mapped ?? mapUnknownError(error, 'Failed to update skill');
    }
}

export async function DELETE(request: Request): Promise<Response> {
    const { env } = getCloudflareContext();

    try {
        await assertAdminMutation(request, env);
        const body = await readJsonObject(request);
        const id = idFromBody(body, 'skill');
        await deleteSkill(env.DB, id);
        return Response.json({ message: 'Skill deleted successfully' }, { status: 200 });
    } catch (error) {
        const mapped = mapSkillError(error);
        return mapped ?? mapUnknownError(error, 'Failed to delete skill');
    }
}
