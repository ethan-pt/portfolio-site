import { getCloudflareContext } from '@opennextjs/cloudflare';
import { assertAdminMutation } from '@/lib/server/admin';
import { assertUploadContent, createProjectImageKey, publicR2Url } from '@/lib/server/r2';
import { HttpError, mapUnknownError } from '@/lib/server/http';

export async function POST(request: Request): Promise<Response> {
    const { env } = getCloudflareContext();

    try {
        await assertAdminMutation(request, env);
        const formData = await request.formData();
        const file = formData.get('file');

        if (!(file instanceof File)) {
            throw new HttpError(400, 'Missing image file');
        }

        assertUploadContent(file.type, file.size);

        const key = createProjectImageKey(file.type);
        await env.BUCKET.put(key, await file.arrayBuffer(), {
            httpMetadata: { contentType: file.type },
        });

        return Response.json({ key, publicUrl: publicR2Url(env, key) }, { status: 201 });
    } catch (error) {
        return mapUnknownError(error, 'Failed to upload image');
    }
}
