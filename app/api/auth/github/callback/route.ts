import { getCloudflareContext } from '@opennextjs/cloudflare';
import {
    adminSessionSetCookie,
    assertAllowedGitHubUser,
    clearCookie,
    exchangeGitHubCode,
    fetchGitHubUser,
    getOAuthStateCookie,
    signAdminJwt,
} from '@/lib/server/auth';
import { HttpError, mapUnknownError } from '@/lib/server/http';

export async function GET(request: Request): Promise<Response> {
    const { env } = getCloudflareContext();

    try {
        const url = new URL(request.url);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const expectedState = getOAuthStateCookie(request);

        if (!code || !state || !expectedState || state !== expectedState) {
            throw new HttpError(401, 'Invalid OAuth callback');
        }

        const accessToken = await exchangeGitHubCode(env, code);
        const githubUser = await fetchGitHubUser(accessToken);
        assertAllowedGitHubUser(env, githubUser);

        const jwt = await signAdminJwt(env, {
            githubId: String(githubUser.id),
            login: githubUser.login,
        });
        const response = Response.redirect(`${env.SITE_ORIGIN ?? new URL(request.url).origin}/admin`, 302);
        response.headers.append('Set-Cookie', adminSessionSetCookie(jwt));
        response.headers.append('Set-Cookie', clearCookie('portfolio_oauth_state'));
        return response;
    } catch (error) {
        return mapUnknownError(error, 'Failed to complete GitHub login');
    }
}
