import { getCloudflareContext } from '@opennextjs/cloudflare';
import {
    listSkills,
    createSkill,
    updateSkill,
    deleteSkill,
    NoFieldsToUpdateError,
    MissingRequiredSkillFieldsError,
    SkillNotFoundError,
} from '@/lib/server/skills';
import type { Skill } from '@/types/db';

type SkillRequestBody = Omit<Skill, 'id' | 'created_at'>;

// Helper for consistent error responses
const errorResponse = (message: string, status: number) => Response.json({ error: message }, { status, headers: { 'Content-Type': 'application/json' } });

export async function GET(): Promise<Response> {
    const { env } = getCloudflareContext();

    try {
        const skills = await listSkills(env.DB);
        return Response.json(skills, { status: 200 });
    } catch (error) {
        console.error('Database query failed:', error);
        return errorResponse('Failed to fetch skills', 500);
    }
}

export async function POST(request: Request): Promise<Response> {
    const { env } = getCloudflareContext();

    let body: SkillRequestBody;
    try {
        body = await request.json();
    } catch (error) {
        console.error('Invalid JSON:', error);
        return errorResponse('Invalid JSON body', 400);
    }

    try {
        const newSkill = await createSkill(env.DB, body);
        return Response.json(newSkill, { status: 201 });
    } catch (error) {
        console.error('Failed to create skill:', error);

        if (error instanceof MissingRequiredSkillFieldsError) {
            return errorResponse('Missing required fields', 400);
        }

        return errorResponse('Failed to create skill', 500);
    }
}

export async function PATCH(request: Request): Promise<Response> {
    const { env } = getCloudflareContext();

    let body: Partial<Skill> & { id: number };
    try {
        body = await request.json();
    } catch (error) {
        console.error('Invalid JSON:', error);
        return errorResponse('Invalid JSON body', 400);
    }

    try {
        const { id } = body;

        if (!id) {
            return errorResponse('Missing skill ID', 400);
        }

        const updatedSkill = await updateSkill(env.DB, id, body);
        return Response.json(updatedSkill, { status: 200 });
    } catch (error) {
        console.error('Failed to update skill:', error);

        if (error instanceof NoFieldsToUpdateError) {
            return errorResponse('No fields to update', 400);
        }

        if (error instanceof SkillNotFoundError) {
            return errorResponse('Skill not found', 404);
        }

        return errorResponse('Failed to update skill', 500);
    }
}

export async function DELETE(request: Request): Promise<Response> {
    const { env } = getCloudflareContext();

    let body: { id: number };
    try {
        body = await request.json();
    } catch (error) {
        console.error('Invalid JSON:', error);
        return errorResponse('Invalid JSON body', 400);
    }

    try {
        const { id } = body;

        if (!id) {
            return errorResponse('Missing skill ID', 400);
        }

        await deleteSkill(env.DB, id);

        return Response.json({ message: 'Skill deleted successfully' }, { status: 200 });
    } catch (error) {
        console.error('Failed to delete skill:', error);

        if (error instanceof SkillNotFoundError) {
            return errorResponse('Skill not found', 404);
        }

        return errorResponse('Failed to delete skill', 500);
    }
}
