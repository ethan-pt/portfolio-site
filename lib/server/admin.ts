import { assertJsonContentType, assertSameOrigin, HttpError } from './http';
import { requireAdminUser, type AuthEnv } from './auth';

export interface AdminRouteEnv extends AuthEnv {
    SITE_ORIGIN?: string;
}

export async function assertAdminMutation(request: Request, env: AdminRouteEnv): Promise<void> {
    await requireAdminUser(request, env);
    assertJsonContentType(request);

    if (!env.SITE_ORIGIN) {
        throw new HttpError(500, 'Missing SITE_ORIGIN');
    }

    assertSameOrigin(request, env.SITE_ORIGIN);
}
