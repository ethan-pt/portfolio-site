import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getAdminUser } from '@/lib/server/auth';
import { mapUnknownError } from '@/lib/server/http';

export async function GET(request: Request): Promise<Response> {
    const { env } = getCloudflareContext();

    try {
        const user = await getAdminUser(request, env);
        return Response.json(user ?? { authenticated: false }, { status: 200 });
    } catch (error) {
        return mapUnknownError(error, 'Failed to read session');
    }
}
