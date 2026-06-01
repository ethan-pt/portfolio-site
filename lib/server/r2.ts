import { HttpError } from './http';

export interface R2SigningEnv {
    R2_ACCOUNT_ID?: string;
    R2_ACCESS_KEY_ID?: string;
    R2_SECRET_ACCESS_KEY?: string;
    R2_BUCKET_NAME?: string;
    R2_PUBLIC_BASE_URL?: string;
}

export interface SignedUpload {
    method: 'PUT';
    uploadUrl: string;
    publicUrl: string;
    key: string;
    expiresIn: number;
    headers: Record<string, string>;
}

const encoder = new TextEncoder();
const uploadPrefix = 'projects/';
const maxUploadBytes = 5 * 1024 * 1024;
const uploadExpiresSeconds = 300;
const allowedContentTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

function required(env: R2SigningEnv, key: keyof R2SigningEnv): string {
    const value = env[key];

    if (!value) {
        throw new HttpError(500, `Missing ${key}`);
    }

    return value;
}

function hex(bytes: ArrayBuffer): string {
    return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(value: string): Promise<string> {
    return hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}

function keyData(key: ArrayBuffer | Uint8Array): ArrayBuffer {
    if (ArrayBuffer.isView(key)) {
        return key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer;
    }

    return key;
}

async function hmac(key: ArrayBuffer | Uint8Array, value: string): Promise<ArrayBuffer> {
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData(key),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
    );

    return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(value));
}

function awsDate(date: Date): { shortDate: string; longDate: string } {
    const iso = date.toISOString().replaceAll('-', '').replaceAll(':', '').replace(/\.\d{3}Z$/, 'Z');
    return { shortDate: iso.slice(0, 8), longDate: iso };
}

function encodePathSegment(value: string): string {
    return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function encodeObjectKey(key: string): string {
    return key.split('/').map(encodePathSegment).join('/');
}

function extensionForContentType(contentType: string): string {
    switch (contentType) {
        case 'image/jpeg':
            return 'jpg';
        case 'image/png':
            return 'png';
        case 'image/webp':
            return 'webp';
        case 'image/avif':
            return 'avif';
        default:
            throw new HttpError(400, 'Unsupported image type');
    }
}

export function assertUploadContent(contentType: string, size: number): void {
    if (!allowedContentTypes.has(contentType)) {
        throw new HttpError(400, 'Unsupported image type');
    }

    if (!Number.isInteger(size) || size <= 0 || size > maxUploadBytes) {
        throw new HttpError(400, 'Invalid image size');
    }
}

export function createProjectImageKey(contentType: string): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const id = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${uploadPrefix}${id}.${extensionForContentType(contentType)}`;
}

export function publicR2Url(env: R2SigningEnv, key: string): string {
    return `${required(env, 'R2_PUBLIC_BASE_URL').replace(/\/$/, '')}/${encodeObjectKey(key)}`;
}

export function isManagedProjectImageKey(key: string | null | undefined): key is string {
    return typeof key === 'string' && key.startsWith(uploadPrefix) && !key.includes('..');
}

export async function deleteManagedR2Object(bucket: R2Bucket, key: string | null | undefined): Promise<void> {
    if (isManagedProjectImageKey(key)) {
        await bucket.delete(key);
    }
}

export async function verifyManagedR2Object(bucket: R2Bucket, key: string): Promise<void> {
    if (!isManagedProjectImageKey(key)) {
        throw new HttpError(400, 'Invalid upload key');
    }

    const object = await bucket.head(key);

    if (!object) {
        throw new HttpError(404, 'Uploaded object not found');
    }
}

export async function createSignedR2PutUrl(env: R2SigningEnv, contentType: string, size: number): Promise<SignedUpload> {
    assertUploadContent(contentType, size);

    const accountId = required(env, 'R2_ACCOUNT_ID');
    const accessKeyId = required(env, 'R2_ACCESS_KEY_ID');
    const secretAccessKey = required(env, 'R2_SECRET_ACCESS_KEY');
    const bucketName = required(env, 'R2_BUCKET_NAME');
    const key = createProjectImageKey(contentType);
    const host = `${accountId}.r2.cloudflarestorage.com`;
    const encodedKey = encodeObjectKey(key);
    const endpoint = `https://${host}/${bucketName}/${encodedKey}`;
    const { shortDate, longDate } = awsDate(new Date());
    const region = 'auto';
    const service = 's3';
    const credentialScope = `${shortDate}/${region}/${service}/aws4_request`;
    const credential = `${accessKeyId}/${credentialScope}`;
    const signedHeaders = 'host';
    const query = new URLSearchParams({
        'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
        'X-Amz-Credential': credential,
        'X-Amz-Date': longDate,
        'X-Amz-Expires': String(uploadExpiresSeconds),
        'X-Amz-SignedHeaders': signedHeaders,
    });
    query.sort();

    const canonicalRequest = [
        'PUT',
        `/${bucketName}/${encodedKey}`,
        query.toString(),
        `host:${host}\n`,
        signedHeaders,
        'UNSIGNED-PAYLOAD',
    ].join('\n');
    const stringToSign = [
        'AWS4-HMAC-SHA256',
        longDate,
        credentialScope,
        await sha256Hex(canonicalRequest),
    ].join('\n');
    const dateKey = await hmac(encoder.encode(`AWS4${secretAccessKey}`), shortDate);
    const dateRegionKey = await hmac(dateKey, region);
    const dateRegionServiceKey = await hmac(dateRegionKey, service);
    const signingKey = await hmac(dateRegionServiceKey, 'aws4_request');
    const signature = hex(await hmac(signingKey, stringToSign));

    query.set('X-Amz-Signature', signature);

    return {
        method: 'PUT',
        uploadUrl: `${endpoint}?${query.toString()}`,
        publicUrl: publicR2Url(env, key),
        key,
        expiresIn: uploadExpiresSeconds,
        headers: {
            'Content-Type': contentType,
        },
    };
}
