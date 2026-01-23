import { getRequestContext } from '@cloudflare/next-on-pages';
import { Project } from '@/types/db';

export const runtime = 'edge';

export async function GET(request: Request) {
    const { env } = getRequestContext();

    try {
        const { results } = await env.DB.prepare(
            'SELECT * FROM projects ORDER BY featured DESC, order_index ASC, created_at DESC'
        ).all<Project>();

        return Response.json(results);
    } catch (error) {
        console.error('Database query failed:', error);
        return new Response('Failed to fetch projects', { status: 500 });
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
    const { title, description, image_url, link, featured, order_index } = body;

    if (!title || !description) {
        return new Response('Missing required fields', { status: 400 });
    } else if (!featured && order_index != null || featured && order_index == null) {
        return new Response('Projects must either be featured and ordered, or non-featured and unordered', { status: 400 });
    }

    try {
        const result = await env.DB.prepare(
            'INSERT INTO projects (title, description, image_url, link, featured, order_index) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(title, description, image_url, link, featured, order_index);

        return Response.json({ id: result.lastRowid, title, description, order_index }, { status: 201 });
    } catch (error) {
        console.error('Database insert failed:', error);
        return new Response('Failed to create project', { status: 500 });
    }
}