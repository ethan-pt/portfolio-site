import { getCloudflareContext } from '@opennextjs/cloudflare';
import { assertAdminMutation } from '@/lib/server/admin';
import { HttpError, mapUnknownError, readJsonObject } from '@/lib/server/http';
import { createSignedR2PutUrl } from '@/lib/server/r2';

export async function POST(request: Request): Promise<Response> {
    const { env } = getCloudflareContext();

    try {
        await assertAdminMutation(request, env);
        const body = await readJsonObject(request);
        const { contentType, size } = body;

        if (typeof contentType !== 'string' || typeof size !== 'number' || !Number.isInteger(size)) {
            throw new HttpError(400, 'Invalid upload request');
        }

        const signedUpload = await createSignedR2PutUrl(env, contentType, size);
        return Response.json(signedUpload, { status: 201 });
    } catch (error) {
        return mapUnknownError(error, 'Failed to sign upload');
    }
}
