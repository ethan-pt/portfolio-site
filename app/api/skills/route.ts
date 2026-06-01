import { getCloudflareContext } from '@opennextjs/cloudflare';
import { listSkillDtos } from '@/lib/server/skills';
import { errorResponse } from '@/lib/server/http';

export async function GET(): Promise<Response> {
    const { env } = getCloudflareContext();

    try {
        const skills = await listSkillDtos(env.DB);
        return Response.json(skills, { status: 200 });
    } catch (error) {
        console.error('Database query failed:', error);
        return errorResponse('Failed to fetch skills', 500);
    }
}
