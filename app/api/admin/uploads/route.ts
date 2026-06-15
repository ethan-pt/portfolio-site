import { getCloudflareContext } from '@opennextjs/cloudflare';
import { assertAdminFormMutation } from '@/lib/server/admin';
import { assertUploadContent, createProjectImageKey, normalizeUploadContentType, publicR2Url } from '@/lib/server/r2';
import { HttpError } from '@/lib/server/http';

type UploadDiagnostics = {
    fileName?: string;
    contentType?: string;
    normalizedContentType?: string;
    size?: number;
    key?: string;
    stage?: string;
};

function uploadErrorResponse(error: unknown, diagnostics: UploadDiagnostics): Response {
    const errorCode = error instanceof HttpError ? 'UPLOAD_VALIDATION_FAILED' : 'UPLOAD_FAILED';
    const message = error instanceof HttpError ? error.message : 'Failed to upload image';
    const status = error instanceof HttpError ? error.status : 500;
    const details = {
        fileName: diagnostics.fileName,
        contentType: diagnostics.contentType,
        normalizedContentType: diagnostics.normalizedContentType,
        size: diagnostics.size,
        stage: diagnostics.stage,
    };

    console.error('Admin image upload failed', {
        code: errorCode,
        status,
        ...details,
        key: diagnostics.key,
        error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error,
    });

    return Response.json({ error: message, code: errorCode, details }, { status });
}

export async function POST(request: Request): Promise<Response> {
    const { env } = getCloudflareContext();
    const diagnostics: UploadDiagnostics = { stage: 'auth' };

    try {
        await assertAdminFormMutation(request, env);

        diagnostics.stage = 'parse_form';
        const formData = await request.formData();
        const file = formData.get('file');

        if (!(file instanceof File)) {
            throw new HttpError(400, 'Missing image file');
        }

        diagnostics.fileName = file.name;
        diagnostics.contentType = file.type;
        diagnostics.size = file.size;
        diagnostics.stage = 'validate';

        const contentType = normalizeUploadContentType(file.type, file.name);
        diagnostics.normalizedContentType = contentType;
        assertUploadContent(contentType, file.size);

        const key = createProjectImageKey(contentType);
        diagnostics.key = key;
        diagnostics.stage = 'r2_put';
        await env.BUCKET.put(key, await file.arrayBuffer(), {
            httpMetadata: { contentType },
        });

        return Response.json({ key, publicUrl: publicR2Url(env, key) }, { status: 201 });
    } catch (error) {
        return uploadErrorResponse(error, diagnostics);
    }
}
