/** Supabase Storage public URL 등에서 파일 버퍼를 가져온다. */
export async function fetchFileBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`파일을 불러올 수 없습니다: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}
