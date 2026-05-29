import { getCloudflareContext } from '@opennextjs/cloudflare';
import {
    listProjects,
    createProject,
    updateProject,
    deleteProject,
    NoFieldsToUpdateError,
    MissingRequiredProjectFieldsError,
    ProjectNotFoundError,
    InvalidProjectFeaturedOrderStateError,
} from '@/lib/projects';
import type { Project } from '@/types/db';

type ProjectRequestBody = Omit<Project, 'id' | 'created_at'>;

// Helper for consistent error responses
const errorResponse = (message: string, status: number) => Response.json({ error: message }, { status, headers: { 'Content-Type': 'application/json' } });

export async function GET(): Promise<Response> {
    const { env } = getCloudflareContext();

    try {
        const projects = await listProjects(env.DB);
        return Response.json(projects, { status: 200 });
    } catch (error) {
        console.error('Database query failed:', error);
        return errorResponse('Failed to fetch projects', 500);
    }
}

export async function POST(request: Request): Promise<Response> {
    const { env } = getCloudflareContext();

    let body: ProjectRequestBody;
    try {
        body = await request.json();
    } catch (error) {
        console.error('Invalid JSON:', error);
        return errorResponse('Invalid JSON body', 400);
    }

    try {
        const newProject = await createProject(env.DB, body);
        
        return Response.json(newProject, { status: 201 });
    } catch (error) {
        console.error('Failed to create project:', error);

        if (error instanceof MissingRequiredProjectFieldsError) {
            return errorResponse('Missing required fields', 400);
        }

        if (error instanceof InvalidProjectFeaturedOrderStateError) {
            return errorResponse('Projects must either be featured and ordered, or non-featured and unordered', 400);
        }

        return errorResponse('Failed to create project', 500);
    }
}

export async function PATCH(request: Request): Promise<Response> {
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

        const updatedProject = await updateProject(env.DB, id, body);
        return Response.json(updatedProject, { status: 200 });
    } catch (error) {
        console.error('Failed to update project:', error);

        if (error instanceof NoFieldsToUpdateError) {
            return errorResponse('No fields to update', 400);
        }

        if (error instanceof ProjectNotFoundError) {
            return errorResponse('Project not found', 404);
        }

        if (error instanceof InvalidProjectFeaturedOrderStateError) {
            return errorResponse('Projects must either be featured and ordered, or non-featured and unordered', 400);
        }

        return errorResponse('Failed to update project', 500);
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
            return errorResponse('Missing project ID', 400);
        }

        await deleteProject(env.DB, id);

        return Response.json({ message: 'Project deleted successfully' }, { status: 200 });
    } catch (error) {
        console.error('Failed to delete project:', error);

        if (error instanceof ProjectNotFoundError) {
            return errorResponse('Project not found', 404);
        }

        return errorResponse('Failed to delete project', 500);
    }
}
