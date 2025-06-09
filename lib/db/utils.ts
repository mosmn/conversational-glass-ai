import { customAlphabet } from "nanoid";

// Generate a secure, URL-friendly share ID
// Using custom alphabet without ambiguous characters (0, O, I, l)
const nanoid = customAlphabet(
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",
  12
);

export function generateShareId(): string {
  return nanoid();
}

export function validateShareId(shareId: string): boolean {
  // Share IDs should be exactly 12 characters from our custom alphabet
  const shareIdRegex =
    /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{12}$/;
  return shareIdRegex.test(shareId);
}
