import { getCloudflareContext } from '@opennextjs/cloudflare';
import { errorResponse } from '@/lib/server/http';
import { isManagedProjectImageKey } from '@/lib/server/r2';

const localR2RoutePrefix = '/api/local-r2/';

function isLocalHostname(hostname: string): boolean {
    return hostname === 'localhost'
        || hostname === '127.0.0.1'
        || hostname === '::1'
        || hostname.startsWith('10.')
        || hostname.startsWith('192.168.')
        || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);
}

function keyFromRequest(request: Request): string | null {
    const url = new URL(request.url);
    const routeIndex = url.pathname.indexOf(localR2RoutePrefix);

    if (routeIndex === -1 || !isLocalHostname(url.hostname)) {
        return null;
    }

    try {
        return url.pathname
            .slice(routeIndex + localR2RoutePrefix.length)
            .split('/')
            .map(decodeURIComponent)
            .join('/');
    } catch {
        return null;
    }
}

export async function GET(request: Request): Promise<Response> {
    const key = keyFromRequest(request);

    if (!key || !isManagedProjectImageKey(key)) {
        return errorResponse('Image not found', 404);
    }

    const { env } = getCloudflareContext();
    const object = await env.BUCKET.get(key);

    if (!object) {
        return errorResponse('Image not found', 404);
    }

    const headers = new Headers();
    const metadata = object.httpMetadata;

    if (metadata?.contentType) headers.set('content-type', metadata.contentType);
    if (metadata?.contentLanguage) headers.set('content-language', metadata.contentLanguage);
    if (metadata?.contentDisposition) headers.set('content-disposition', metadata.contentDisposition);
    if (metadata?.contentEncoding) headers.set('content-encoding', metadata.contentEncoding);
    if (metadata?.cacheControl) headers.set('cache-control', metadata.cacheControl);
    if (metadata?.cacheExpiry) headers.set('expires', metadata.cacheExpiry.toUTCString());

    headers.set('etag', object.httpEtag);
    headers.set('cache-control', 'no-store');

    return new Response(object.body, { headers });
}
