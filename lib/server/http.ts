export class HttpError extends Error {
    constructor(public readonly status: number, message: string) {
        super(message);
        this.name = 'HttpError';
    }
}

export function jsonResponse(data: unknown, status = 200): Response {
    return Response.json(data, {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

export function errorResponse(message: string, status: number): Response {
    return jsonResponse({ error: message }, status);
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
    let body: unknown;

    try {
        body = await request.json();
    } catch {
        throw new HttpError(400, 'Invalid JSON body');
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw new HttpError(400, 'Expected JSON object body');
    }

    return body as Record<string, unknown>;
}

export function assertJsonContentType(request: Request): void {
    const contentType = request.headers.get('content-type') ?? '';

    if (!contentType.toLowerCase().includes('application/json')) {
        throw new HttpError(415, 'Unsupported content type');
    }
}

export function assertSameOrigin(request: Request, siteOrigin: string): void {
    const expectedOrigin = new URL(siteOrigin).origin;
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');

    if (origin && new URL(origin).origin !== expectedOrigin) {
        throw new HttpError(403, 'Invalid request origin');
    }

    if (!origin && referer && new URL(referer).origin !== expectedOrigin) {
        throw new HttpError(403, 'Invalid request origin');
    }
}

export function mapUnknownError(error: unknown, fallbackMessage: string): Response {
    if (error instanceof HttpError) {
        return errorResponse(error.message, error.status);
    }

    console.error(fallbackMessage, error);
    return errorResponse(fallbackMessage, 500);
}
