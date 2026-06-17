import { getCloudflareContext } from '@opennextjs/cloudflare';
import { clearCookie } from '@/lib/server/auth';

export async function POST(): Promise<Response> {
    const { env } = getCloudflareContext();
    const response = Response.json({ authenticated: false }, { status: 200 });
    response.headers.append('Set-Cookie', clearCookie('portfolio_admin_session', env));
    return response;
}
