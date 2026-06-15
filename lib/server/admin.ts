import { assertJsonContentType, assertSameOrigin, HttpError } from './http';
import { requireAdminUser, type AuthEnv } from './auth';

export interface AdminRouteEnv extends AuthEnv {
    SITE_ORIGIN?: string;
}

function assertAdminMutationOrigin(request: Request, env: AdminRouteEnv): void {
    if (!env.SITE_ORIGIN) {
        throw new HttpError(500, 'Missing SITE_ORIGIN');
    }

    assertSameOrigin(request, env.SITE_ORIGIN);
}

export async function assertAdminMutation(request: Request, env: AdminRouteEnv): Promise<void> {
    await requireAdminUser(request, env);
    assertJsonContentType(request);
    assertAdminMutationOrigin(request, env);
}

export async function assertAdminFormMutation(request: Request, env: AdminRouteEnv): Promise<void> {
    await requireAdminUser(request, env);

    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().includes('multipart/form-data')) {
        throw new HttpError(415, 'Unsupported upload content type');
    }

    assertAdminMutationOrigin(request, env);
}
