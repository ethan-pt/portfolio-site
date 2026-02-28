import { getCloudflareContext } from '@opennextjs/cloudflare';
import { Project } from '@/types/db';

type ProjectRequestBody = Omit<Project, 'id' | 'created_at'>;

// Helper for consistent error responses
const errorResponse = (message: string, status: number) => Response.json({ error: message }, { status, headers: { 'Content-Type': 'application/json' } });

export async function GET(request: Request) {
    const { env } = getCloudflareContext();

    try {
        const { results } = await env.DB.prepare(
            'SELECT * FROM projects ORDER BY featured DESC, category DESC, order_index ASC, created_at DESC'
        ).all<Project>();

        return Response.json(results, { status: 200 });
    } catch (error) {
        console.error('Database query failed:', error);
        return errorResponse('Failed to fetch projects', 500);
    }
}

export async function POST(request: Request) {
    const { env } = getCloudflareContext();

    let body: ProjectRequestBody;
    try {
        body = await request.json();
    } catch (error) {
        console.error('Invalid JSON:', error);
        return errorResponse('Invalid JSON body', 400);
    }

    try {
        const { title, description, image_url, link, category, featured, order_index } = body;

        if (!title || !description || !link || !category) {
            return errorResponse('Missing required fields', 400);
        }
        if ((featured === true && order_index == null) || (featured === false && order_index !== null)) {
            return errorResponse('Projects must either be featured and ordered, or non-featured and unordered', 400);
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
        return errorResponse('Failed to create project', 500);
    }
}

export async function PATCH(request: Request) {
    const { env } = getCloudflareContext();

    let body: Partial<Project> & { id: number };
    try {
        body = await request.json();
    } catch (error) {
        console.error('Invalid JSON:', error);
        return errorResponse('Invalid JSON body', 400);
    }

    try {
        const { id } = body;

        if (!id) {
            return errorResponse('Missing project ID', 400);
        }

        const existingProject = await env.DB.prepare(
            'SELECT * FROM projects WHERE id = ?'
        ).get<Project>(id);

        if (!existingProject) {
            return errorResponse('Project not found', 404);
        }

        // Validate the final state of the object by merging the existing project with the patch body
        const finalFeatured = body.featured !== undefined ? body.featured : existingProject.featured;
        const finalOrderIndex = body.order_index !== undefined ? body.order_index : existingProject.order_index;

        if ((finalFeatured === true && finalOrderIndex === null) || (finalFeatured === false && finalOrderIndex !== null)) {
            return errorResponse('Projects must either be featured and ordered, or non-featured and unordered', 400);
        }

        const potentialUpdates: Partial<Omit<Project, 'id' | 'created_at'>> = {
            title: body.title,
            description: body.description,
            image_url: body.image_url,
            link: body.link,
            category: body.category,
            featured: body.featured,
            order_index: body.order_index,
        };

        const updates: string[] = [];
        const values: (string | number | boolean | null)[] = [];

        // Build the query dynamically from defined properties in the body
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
            `UPDATE projects SET ${updates.join(', ')} WHERE id = ?`
        ).run(...values);

        return Response.json({ changes: result.changes }, { status: 200 });
    } catch (error) {
        console.error('Failed to update project:', error);
        return errorResponse('Failed to update project', 500);
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
            return errorResponse('Missing project ID', 400);
        }

        const result = await env.DB.prepare(
            'DELETE FROM projects WHERE id = ?'
        ).run(id);

        if (result.changes === 0) {
            return errorResponse('Project not found', 404);
        }

        return Response.json({ message: 'Project deleted successfully' }, { status: 200 });
    } catch (error) {
        console.error('Failed to delete project:', error);
        return errorResponse('Failed to delete project', 500);
    }
}
