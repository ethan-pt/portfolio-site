import { getCloudflareContext } from '@opennextjs/cloudflare';
import { requireAdminUser } from '@/lib/server/auth';
import { mapUnknownError } from '@/lib/server/http';
import { searchSkillIcons } from '@/lib/server/skill-icons';

export async function GET(request: Request): Promise<Response> {
    const { env } = getCloudflareContext();

    try {
        await requireAdminUser(request, env);
        const url = new URL(request.url);
        const query = url.searchParams.get('query') ?? '';
        return Response.json(searchSkillIcons(query), { status: 200 });
    } catch (error) {
        return mapUnknownError(error, 'Failed to search skill icons');
    }
}
