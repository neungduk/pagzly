import { DeleteObjectsCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { SIGNED_URL_TTL_SECONDS } from "@/lib/storage/policy";
import { trimSlash } from "@/lib/storage/public-url";
import type { PutObjectInput, StorageProvider } from "@/lib/storage/types";

/**
 * 459차 — Cloudflare R2(S3 호환). 서버 전용: 비밀키를 다루므로 "use client" 파일에서 가져오지 않는다(회귀가 확인).
 * 엔드포인트 https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com · 리전 auto · 경로 스타일은 쓰지 않는다(R2 문서 예시와 같은 기본 설정).
 * AWS SDK v3의 기본 체크섬(CRC32)은 R2 서명 PUT와 맞지 않을 수 있어 `WHEN_REQUIRED`로 둔다(R2 권장).
 */
export type R2Config = { accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string; publicBaseUrl: string };

export type R2Deps = {
  client?: { send(cmd: unknown): Promise<unknown> };
  presign?: (cmd: PutObjectCommand, opts: { expiresIn: number; signableHeaders: Set<string> }) => Promise<string>;
};

export const r2Endpoint = (accountId: string): string => `https://${accountId}.r2.cloudflarestorage.com`;

export function createR2Provider(cfg: R2Config, deps: R2Deps = {}): StorageProvider {
  const base = trimSlash(cfg.publicBaseUrl);
  let real: S3Client | null = null;
  const s3 = (): S3Client => (real ??= new S3Client({
    region: "auto",
    endpoint: r2Endpoint(cfg.accountId),
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  }));
  const send = (cmd: unknown): Promise<unknown> => (deps.client ?? s3()).send(cmd as never);
  const presign = deps.presign ?? ((cmd: PutObjectCommand, opts: { expiresIn: number; signableHeaders: Set<string> }) => getSignedUrl(s3(), cmd, opts));
  const publicUrl = (path: string): string => `${base}/${path.replace(/^\/+/, "")}`;

  return {
    name: "r2",
    async putObject(input: PutObjectInput) {
      try {
        // upsert=false도 R2에서는 덮어쓰기와 같다(경로가 고유하게 만들어지므로 충돌하지 않는다). 필요하면 IfNoneMatch로 막는다
        const body = input.body instanceof Uint8Array ? input.body : new Uint8Array(await (input.body as Blob).arrayBuffer());
        await send(new PutObjectCommand({
          Bucket: cfg.bucket,
          Key: input.path,
          Body: body,
          ContentType: input.contentType,
          CacheControl: input.cacheControl,
          ...(input.upsert === false ? { IfNoneMatch: "*" } : {}),
        }));
        return { error: null };
      } catch (e) {
        return { error: { message: e instanceof Error ? e.message : String(e) } };
      }
    },
    getPublicUrl: publicUrl,
    async removeObjects(paths: string[]) {
      if (paths.length === 0) return { error: null };
      try {
        await send(new DeleteObjectsCommand({ Bucket: cfg.bucket, Delete: { Objects: paths.map((Key) => ({ Key })), Quiet: true } }));
        return { error: null };
      } catch (e) {
        return { error: { message: e instanceof Error ? e.message : String(e) } };
      }
    },
    async createUploadTarget({ path, contentType, size }) {
      const cmd = new PutObjectCommand({ Bucket: cfg.bucket, Key: path, ContentType: contentType, ContentLength: size });
      const url = await presign(cmd, { expiresIn: SIGNED_URL_TTL_SECONDS, signableHeaders: new Set(["content-type", "content-length"]) });
      return { url, headers: { "Content-Type": contentType }, publicUrl: publicUrl(path), path, expiresInSeconds: SIGNED_URL_TTL_SECONDS };
    },
  };
}
