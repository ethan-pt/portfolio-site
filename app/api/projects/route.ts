import { getCloudflareContext } from '@opennextjs/cloudflare';
import { listProjectDtos } from '@/lib/server/projects';
import { errorResponse } from '@/lib/server/http';

export async function GET(): Promise<Response> {
    const { env } = getCloudflareContext();

    try {
        const projects = await listProjectDtos(env.DB);
        return Response.json(projects, { status: 200 });
    } catch (error) {
        console.error('Database query failed:', error);
        return errorResponse('Failed to fetch projects', 500);
    }
}
