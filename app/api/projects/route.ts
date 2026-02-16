import { getCloudflareContext } from '@opennextjs/cloudflare';
import { Project } from '@/types/db';

type ProjectRequestBody = Omit<Project, 'id' | 'created_at'>;

export async function GET(request: Request) {
    const { env } = getCloudflareContext();

    try {
        const { results } = await env.DB.prepare(
            'SELECT * FROM projects ORDER BY featured DESC, category DESC, order_index ASC, created_at DESC'
        ).all<Project>();

        return Response.json(results, { status: 200 });
    } catch (error) {
        console.error('Database query failed:', error);
        return new Response('Failed to fetch projects', { status: 500 });
    }
}

export async function POST(request: Request) {
    const { env } = getCloudflareContext();

    try {
        const body = await request.json() as ProjectRequestBody;
        const { title, description, image_url, link, category, featured, order_index } = body;

        if (!title || !description || !link || !category) {
            return new Response('Missing required fields', { status: 400 });
        } else if (!featured && order_index != null || featured && order_index == null) {
            return new Response('Projects must either be featured and ordered, or non-featured and unordered', { status: 400 });
        }

        const result = await env.DB.prepare(
            'INSERT INTO projects (title, description, image_url, link, category, featured, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(title, description, image_url, link, category, featured, order_index);

        const newProject: Project = {
            id: result.lastRowId as number,
            title,
            description,
            image_url,
            link,
            category,
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

export async function PATCH(request: Request) {
    const { env } = getCloudflareContext();

    try {
        const body = await request.json() as Partial<Project> & { id: number };
        const { id, title, description, image_url, link, category, featured, order_index } = body;

        if (!id) {
            return new Response('Missing project ID', { status: 400 });
        }

        const existingProject = await env.DB.prepare(
            'SELECT * FROM projects WHERE id = ?'
        ).get<Project>(id);

        if (!existingProject) {
            return new Response('Project not found', { status: 404 });
        } else if (!featured && order_index != null || featured && order_index == null) {
            return new Response('Projects must either be featured and ordered, or non-featured and unordered', { status: 400 });
        }

        const result = await env.DB.prepare(
            `UPDATE projects SET 
                title = COALESCE(?, title), 
                description = COALESCE(?, description), 
                image_url = COALESCE(?, image_url), 
                link = COALESCE(?, link), 
                category = COALESCE(?, category),
                featured = COALESCE(?, featured), 
                order_index = COALESCE(?, order_index) 
             WHERE id = ?`
        ).run(title, description, image_url, link, category, featured, order_index, id);

        return Response.json({ changes: result.changes }, { status: 200 });
    } catch (error) {
        console.error('Failed to update project:', error);
        return new Response('Failed to update project', { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { env } = getCloudflareContext();

    try {
        const body = await request.json() as { id: number };
        const { id } = body;

        if (!id) {
            return new Response('Missing project ID', { status: 400 });
        }

        const existingProject = await env.DB.prepare(
            'SELECT * FROM projects WHERE id = ?'
        ).get<Project>(id);

        if (!existingProject) {
            return new Response('Project not found', { status: 404 });
        }

        await env.DB.prepare(
            'DELETE FROM projects WHERE id = ?'
        ).run(id);

        return new Response('Project deleted successfully', { status: 200 });
    } catch (error) {
        console.error('Failed to delete project:', error);
        return new Response('Failed to delete project', { status: 500 });
    }
}
