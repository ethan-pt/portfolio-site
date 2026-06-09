import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { AdminDashboard } from '@/components/admin/admin-dashboard';
import { getAdminUser } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

function requestFromHeaders(headerList: Headers, siteOrigin?: string): Request {
    const host = headerList.get('host') ?? 'localhost';
    const protocol = headerList.get('x-forwarded-proto') ?? (siteOrigin ? new URL(siteOrigin).protocol.replace(':', '') : 'https');
    const origin = siteOrigin ?? `${protocol}://${host}`;

    return new Request(`${origin}/admin`, {
        headers: {
            cookie: headerList.get('cookie') ?? '',
        },
    });
}

export default async function AdminPage() {
    const { env } = await getCloudflareContext({ async: true });
    const headerList = await headers();
    const user = await getAdminUser(requestFromHeaders(headerList, env.SITE_ORIGIN), env);

    if (!user) {
        redirect('/api/auth/github/start');
    }

    return <AdminDashboard initialUser={user} />;
}
