import { clearCookie } from '@/lib/server/auth';

export async function POST(): Promise<Response> {
    const response = Response.json({ authenticated: false }, { status: 200 });
    response.headers.append('Set-Cookie', clearCookie('portfolio_admin_session'));
    return response;
}
