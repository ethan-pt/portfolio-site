import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function GET(request: Request) {
    const { env } = getRequestContext();

    try {
        const { results } = await env.DB.prepare(
            'SELECT * FROM projects ORDER BY order_index ASC, created_at DESC'
        ).all();

        return Response.json(results);
    } catch (error) {
        console.error('Database query failed:', error);
        return new Response('Failed to fetch projects', { status: 500 });
    }
}