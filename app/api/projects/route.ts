import { getRequestContext } from '@cloudflare/next-on-pages';
import { Project } from '@/types/db';

export const runtime = 'edge';

type ProjectRequestBody = Omit<Project, 'id' | 'created_at'>;

export async function GET(request: Request) {
    const { env } = getRequestContext();

    try {
        const { results } = await env.DB.prepare(
            'SELECT * FROM projects ORDER BY featured DESC, order_index ASC, created_at DESC'
        ).all<Project>();

        return Response.json(results, { status: 200 });
    } catch (error) {
        console.error('Database query failed:', error);
        return new Response('Failed to fetch projects', { status: 500 });
    }
}

export async function POST(request: Request) {
    const { env } = getRequestContext();

    try {
        const body = await request.json() as ProjectRequestBody;
        const { title, description, image_url, link, featured, order_index } = body;

        if (!title || !description) {
            return new Response('Missing required fields', { status: 400 });
        } else if (!featured && order_index != null || featured && order_index == null) {
            return new Response('Projects must either be featured and ordered, or non-featured and unordered', { status: 400 });
        }

        const result = await env.DB.prepare(
            'INSERT INTO projects (title, description, image_url, link, featured, order_index) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(title, description, image_url, link, featured, order_index);

        const newProject: Project = {
            id: result.lastRowId as number,
            title,
            description,
            image_url,
            link,
            featured,
            order_index,
            created_at: new Date().toISOString(),
        };
        
        return Response.json(newProject, { status: 201 });
    } catch (error) {
        console.error('Failed to create project:', error);
        return new Response('Failed to create project', { status: 500 });
    }
}