type VerificationResult =
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; reason: "invalid" | "expired" };

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

async function importHs256Key(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
}

export async function verifyHs256Jwt(
  token: string,
  secret: string,
): Promise<VerificationResult> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return { ok: false, reason: "invalid" };
  }

  const [headerSegment, payloadSegment, signatureSegment] = parts;

  try {
    const header = JSON.parse(
      new TextDecoder().decode(decodeBase64Url(headerSegment)),
    ) as { alg?: string };
    const payload = JSON.parse(
      new TextDecoder().decode(decodeBase64Url(payloadSegment)),
    ) as Record<string, unknown>;

    if (header.alg !== "HS256") {
      return { ok: false, reason: "invalid" };
    }

    const key = await importHs256Key(secret);
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      toArrayBuffer(decodeBase64Url(signatureSegment)),
      new TextEncoder().encode(`${headerSegment}.${payloadSegment}`),
    );

    if (!isValid) {
      return { ok: false, reason: "invalid" };
    }

    const expiresAt =
      typeof payload.exp === "number" ? payload.exp * 1000 : undefined;

    if (expiresAt && Date.now() >= expiresAt) {
      return { ok: false, reason: "expired" };
    }

    return { ok: true, payload };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

export default verifyHs256Jwt;
