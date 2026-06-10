import Link from 'next/link';
import { headers } from 'next/headers';
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

function AdminLogin() {
    return (
        <main className="min-h-screen bg-[#151515] px-6 py-16 text-[#f8f5f5]">
            <section className="mx-auto max-w-xl border border-[#B4A5A5]/20 bg-[#1a1a1d] p-6">
                <h1 className="text-2xl font-semibold">Admin</h1>
                <p className="mt-3 text-sm text-[#d8d0d0]">
                    Sign in with the configured GitHub admin account to manage portfolio content.
                </p>
                <Link
                    href="/api/auth/github/start"
                    className="mt-6 inline-flex rounded-md border border-[#B4A5A5]/35 px-4 py-2 text-sm font-semibold text-white transition hover:border-[#B4A5A5]/70 hover:bg-[#B4A5A5]/10"
                >
                    Continue with GitHub
                </Link>
            </section>
        </main>
    );
}

export default async function AdminPage() {
    const { env } = await getCloudflareContext({ async: true });
    const headerList = await headers();
    const user = await getAdminUser(requestFromHeaders(headerList, env.SITE_ORIGIN), env);

    if (!user) {
        return <AdminLogin />;
    }

    return <AdminDashboard initialUser={user} />;
}
