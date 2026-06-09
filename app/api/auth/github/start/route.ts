import { getCloudflareContext } from '@opennextjs/cloudflare';
import { createOAuthState, githubAuthorizeUrl, oauthStateSetCookie } from '@/lib/server/auth';
import { mapUnknownError } from '@/lib/server/http';

export async function GET(): Promise<Response> {
    const { env } = getCloudflareContext();

    try {
        const state = createOAuthState();

        return new Response(null, {
            status: 302,
            headers: {
                Location: githubAuthorizeUrl(env, state),
                'Set-Cookie': oauthStateSetCookie(state),
            },
        });
    } catch (error) {
        return mapUnknownError(error, 'Failed to start GitHub login');
    }
}
