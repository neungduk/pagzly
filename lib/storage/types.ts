/**
 * 459차 — 이미지 저장소 추상화. 앱은 버킷 `images` 하나만 쓴다. 기본은 Supabase Storage(현재 동작 그대로), `STORAGE_PROVIDER=r2`면 Cloudflare R2.
 * 서버 코드는 getStorage(supabase)로, 브라우저 직접 업로드는 lib/storage/client-upload.ts로 이 계층을 지난다.
 */
export type PutObjectInput = {
  path: string;
  body: Buffer | Uint8Array | Blob | File;
  contentType?: string;
  /** 고유 경로면 CACHE_IMMUTABLE, upsert로 같은 경로를 덮어쓰면 CACHE_SHORT. Supabase 모드는 기본 동작 유지를 위해 무시한다 */
  cacheControl?: string;
  upsert?: boolean;
};

/** 오류는 던지지 않고 message로 돌려준다(기존 `{ error }` 형태와 같다) */
export type StorageResult = { error: { message: string } | null };

export type UploadTarget = {
  /** 브라우저가 PUT할 서명 주소 */
  url: string;
  /** PUT에 반드시 실어야 하는 헤더(Content-Type 등). Content-Length는 fetch가 붙인다 */
  headers: Record<string, string>;
  publicUrl: string;
  path: string;
  expiresInSeconds: number;
};

export interface StorageProvider {
  readonly name: "supabase" | "r2";
  putObject(input: PutObjectInput): Promise<StorageResult>;
  getPublicUrl(path: string): string;
  removeObjects(paths: string[]): Promise<StorageResult>;
  /** 브라우저 직접 업로드용 서명 주소. Supabase 모드에서는 null(기존 클라이언트 업로드를 유지) */
  createUploadTarget(input: { path: string; contentType: string; size: number }): Promise<UploadTarget | null>;
}
