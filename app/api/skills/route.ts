import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function GET(request: Request) {
    const { env } = getRequestContext();

    try {
        const { results } = await env.DB.prepare(
            'SELECT * FROM skills ORDER BY category ASC, name ASC'
        ).all();

        return Response.json(results);
    } catch (error) {
        console.error('Database query failed:', error);
        return new Response('Failed to fetch skills', { status: 500 });
    }
}

export async function POST(request: Request) {
    const { env } = getRequestContext();
    
    let body;
    try {
        body = await request.json();
    } catch (error) {
        console.error('Invalid JSON body:', error);
        return new Response('Invalid JSON body', { status: 400})
    }
    const { name, category } = body;

    if (!name || !category) {
        return new Response('Missing required fields', { status: 400 });
    }

    try {
        const result = await env.DB.prepare(
            'INSERT INTO skills (name, category) VALUES (?, ?)'
        ).run(name, category);

        return Response.json({ id: result.lastRowId, name, category }, { status: 201 });
    } catch (error) {
        console.error('Database insert failed:', error);
        return new Response('Failed to create skill', { status: 500 });
    }
}