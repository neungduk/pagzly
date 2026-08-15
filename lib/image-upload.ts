export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png"];
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "JPG, PNG 파일만 업로드할 수 있습니다.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "이미지는 8MB 이하여야 합니다.";
  }
  return null;
}
