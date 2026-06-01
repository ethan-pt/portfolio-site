interface CloudflareEnv {
    DB: D1Database;
    BUCKET: R2Bucket;
    NEXTJS_ENV?: string;
    SITE_ORIGIN?: string;
    AUTH_COOKIE_SECRET?: string;
    GITHUB_CLIENT_ID?: string;
    GITHUB_CLIENT_SECRET?: string;
    GITHUB_ADMIN_ID?: string;
    GITHUB_ADMIN_LOGIN?: string;
    R2_ACCOUNT_ID?: string;
    R2_ACCESS_KEY_ID?: string;
    R2_SECRET_ACCESS_KEY?: string;
    R2_BUCKET_NAME?: string;
    R2_PUBLIC_BASE_URL?: string;
}
