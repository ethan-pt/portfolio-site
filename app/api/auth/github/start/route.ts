import { getCloudflareContext } from '@opennextjs/cloudflare';
import { createOAuthState, githubAuthorizeUrl, oauthStateSetCookie } from '@/lib/server/auth';
import { mapUnknownError } from '@/lib/server/http';

export async function GET(): Promise<Response> {
    const { env } = getCloudflareContext();

    try {
        const state = createOAuthState();
        const response = Response.redirect(githubAuthorizeUrl(env, state), 302);
        response.headers.append('Set-Cookie', oauthStateSetCookie(state));
        return response;
    } catch (error) {
        return mapUnknownError(error, 'Failed to start GitHub login');
    }
}
