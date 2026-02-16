import { getCloudflareContext } from '@opennextjs/cloudflare';
import { Skill } from '@/types/db';

type SkillRequestBody = Omit<Skill, 'id' | 'created_at'>;

export async function GET(request: Request) {
    const { env } = getCloudflareContext();

    try {
        const { results } = await env.DB.prepare(
            'SELECT * FROM skills ORDER BY featured DESC, category ASC, name ASC'
        ).all<Skill>();

        return Response.json(results, { status: 200 });
    } catch (error) {
        console.error('Database query failed:', error);
        return new Response('Failed to fetch skills', { status: 500 });
    }
}

export async function POST(request: Request) {
    const { env } = getCloudflareContext();

    try {
        const body = await request.json() as SkillRequestBody;
        const { name, category, featured } = body;

        if (!name || !category) {
            return new Response('Missing required fields', { status: 400 });
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
        return new Response('Failed to create skill', { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const { env } = getCloudflareContext();
    
    try {
        const body = await request.json() as Partial<Skill> & { id: number };
        const { id, name, category, featured } = body;

        if (!id) {
            return new Response('Missing skill ID', { status: 400 });
        }

        const existingSkill = await env.DB.prepare(
            'SELECT * FROM skills WHERE id = ?'
        ).get<Skill>(id);

        if (!existingSkill) {
            return new Response('Skill not found', { status: 404 });
        }

        const result = await env.DB.prepare(
            `UPDATE skills SET
                name = COALESCE(?, name),
                category = COALESCE(?, category),
                featured = COALESCE(?, featured)
            WHERE id = ?`
        ).run(name, category, featured, id);

        return Response.json({ changes: result.changes }, { status: 200 });
    } catch (error) {
        console.error('Failed to update skill:', error);
        return new Response('Failed to update skill', { status: 500 });
    }
}
