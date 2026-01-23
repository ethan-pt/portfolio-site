import { getRequestContext } from '@cloudflare/next-on-pages';
import { Skill } from '@/types/db';

export const runtime = 'edge';

export async function GET(request: Request) {
    const { env } = getRequestContext();

    try {
        const { results } = await env.DB.prepare(
            'SELECT * FROM skills ORDER BY category ASC, name ASC'
        ).all<Skill>();

        return Response.json(results);
    } catch (error) {
        console.error('Database query failed:', error);
        return new Response('Failed to fetch skills', { status: 500 });
    }
}

type SkillRequestBody = Omit<Skill, 'id' | 'created_at'>;
export async function POST(request: Request) {
    const { env } = getRequestContext();

    try {
        const body = await request.json() as SkillRequestBody;
        const { name, category } = body;

        if (!name || !category) {
            return new Response('Missing required fields', { status: 400 });
        }

        const result = await env.DB.prepare(
            'INSERT INTO skills (name, category) VALUES (?, ?)'
        ).run(name, category);

        const newSkill: Skill = {
            id: result.lastRowId as number,
            name,
            category,
            created_at: new Date().toISOString(),
        };

        return Response.json(newSkill, { status: 201 });
    } catch (error) {
        console.error('Failed to create skill:', error);
        return new Response('Failed to create skill', { status: 500 });
    }
}