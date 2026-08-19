export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB
export const AVATAR_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
export const AVATAR_ACCEPT = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

export type UserProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  age: number | null;
  blood_group: string | null;
  avatar_path: string | null;
  language: string;
};

export type ImageProblem = "size" | "type" | null;

export function validateImage(file: File): ImageProblem {
  if (!AVATAR_MIME.includes(file.type)) return "type";
  if (file.size > MAX_AVATAR_BYTES) return "size";
  return null;
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export function initialsFrom(name: string | null | undefined, email: string | null | undefined) {
  const source = (name ?? "").trim() || (email ?? "").trim();
  if (!source) return "SA";
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : source.slice(0, 2);
  return letters.toUpperCase();
}

/** Downscales a picked/captured photo so avatars stay small and load fast. */
export async function compressAvatar(file: File, max = 512): Promise<Blob> {
  if (typeof document === "undefined") return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9),
  );
  return blob ?? file;
}
