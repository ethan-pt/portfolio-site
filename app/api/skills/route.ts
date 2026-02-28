import { getCloudflareContext } from '@opennextjs/cloudflare';
import { Skill } from '@/types/db';

type SkillRequestBody = Omit<Skill, 'id' | 'created_at'>;

// Helper for consistent error responses
const errorResponse = (message: string, status: number) => Response.json({ error: message }, { status, headers: { 'Content-Type': 'application/json' } });

export async function GET(request: Request) {
    const { env } = getCloudflareContext();

    try {
        const { results } = await env.DB.prepare(
            'SELECT * FROM skills ORDER BY featured DESC, category ASC, name ASC'
        ).all<Skill>();

        return Response.json(results, { status: 200 });
    } catch (error) {
        console.error('Database query failed:', error);
        return errorResponse('Failed to fetch skills', 500);
    }
}

export async function POST(request: Request) {
    const { env } = getCloudflareContext();

    let body: SkillRequestBody;
    try {
        body = await request.json();
    } catch (error) {
        console.error('Invalid JSON:', error);
        return errorResponse('Invalid JSON body', 400);
    }

    try {
        const { name, category, featured } = body;

        if (!name || !category) {
            return errorResponse('Missing required fields', 400);
        }

        const result = await env.DB.prepare(
            'INSERT INTO skills (name, category, featured) VALUES (?, ?, ?)'
        ).run(name, category, featured);

        const newSkill: Skill = {
            id: result.lastRowId as number,
            name,
            category,
            featured,
            created_at: new Date().toISOString(),
        };

        return Response.json(newSkill, { status: 201 });
    } catch (error) {
        console.error('Failed to create skill:', error);
        return errorResponse('Failed to create skill', 500);
    }
}

export async function PATCH(request: Request) {
    const { env } = getCloudflareContext();
    
    let body: Partial<Skill> & { id: number };
    try {
        body = await request.json();
    } catch (error) {
        console.error('Invalid JSON:', error);
        return errorResponse('Invalid JSON body', 400);
    }

    try {
        const { id, name, category, featured } = body;

        if (!id) {
            return errorResponse('Missing skill ID', 400);
        }

        const existingSkill = await env.DB.prepare(
            'SELECT * FROM skills WHERE id = ?'
        ).get<Skill>(id);

        if (!existingSkill) {
            return errorResponse('Skill not found', 404);
        }

        const potentialUpdates: Partial<Omit<Skill, 'id' | 'created_at'>> = {
            name: body.name,
            category: body.category,
            featured: body.featured,
        }

        const updates: string[] = [];
        const values: (string | number | boolean)[] = [];

        for (const [key, value] of Object.entries(potentialUpdates)) {
            if (value !== undefined) {
                updates.push(`${key} = ?`);
                values.push(value);
            }
        }

        if (updates.length === 0) {
            return errorResponse('No fields to update', 400);
        }

        values.push(id);

        const result = await env.DB.prepare(
            `UPDATE skills SET ${updates.join(', ')} WHERE id = ?`
        ).run(...values);

        return Response.json({ changes: result.changes }, { status: 200 });
    } catch (error) {
        console.error('Failed to update skill:', error);
        return errorResponse('Failed to update skill', 500);
    }
}

export async function DELETE(request: Request) {
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

        const result = await env.DB.prepare(
            'DELETE FROM skills WHERE id = ?'
        ).run(id);

        if (result.changes === 0) {
            return errorResponse('Skill not found', 404);
        }

        return Response.json({ message: 'Skill deleted successfully' }, { status: 200 });
    } catch (error) {
        console.error('Failed to delete skill:', error);
        return errorResponse('Failed to delete skill', 500);
    }
}