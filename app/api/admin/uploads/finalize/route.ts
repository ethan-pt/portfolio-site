import { getCloudflareContext } from '@opennextjs/cloudflare';
import { assertAdminMutation } from '@/lib/server/admin';
import { HttpError, mapUnknownError, readJsonObject } from '@/lib/server/http';
import { publicR2Url, verifyManagedR2Object } from '@/lib/server/r2';

export async function POST(request: Request): Promise<Response> {
    const { env } = getCloudflareContext();

    try {
        await assertAdminMutation(request, env);
        const body = await readJsonObject(request);
        const { key } = body;

        if (typeof key !== 'string') {
            throw new HttpError(400, 'Invalid upload key');
        }

        await verifyManagedR2Object(env.BUCKET, key);

        return Response.json({ key, publicUrl: publicR2Url(env, key) }, { status: 200 });
    } catch (error) {
        return mapUnknownError(error, 'Failed to finalize upload');
    }
}
