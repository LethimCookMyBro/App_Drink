export function maskEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const [localPart, domainPart] = normalized.split("@");

  if (!localPart || !domainPart) {
    return maskIdentifier(normalized) ?? "•••";
  }

  const maskedLocal =
    localPart.length <= 2
      ? `${localPart[0] ?? ""}•`
      : `${localPart.slice(0, 2)}${"•".repeat(Math.max(2, localPart.length - 2))}`;

  const [domainName, ...suffixParts] = domainPart.split(".");
  const maskedDomain =
    domainName.length <= 2
      ? `${domainName[0] ?? ""}•`
      : `${domainName[0]}${"•".repeat(Math.max(2, domainName.length - 1))}`;

  return `${maskedLocal}@${maskedDomain}${suffixParts.length ? `.${suffixParts.join(".")}` : ""}`;
}

export function maskPhone(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, "");

  if (digitsOnly.length <= 4) {
    return `${digitsOnly.slice(0, 1)}•••`;
  }

  return `${digitsOnly.slice(0, 2)}••••${digitsOnly.slice(-2)}`;
}

export function maskContact(contact: string | null | undefined): string | null {
  if (!contact) return null;

  return contact.includes("@") ? maskEmail(contact) : maskPhone(contact);
}

export function maskIpAddress(ip: string | null | undefined): string | null {
  if (!ip) return null;

  if (ip.includes(":")) {
    const segments = ip.split(":").filter(Boolean);
    if (segments.length <= 2) {
      return `${segments[0] ?? "*"}:*:*`;
    }

    return `${segments.slice(0, 2).join(":")}:*:*`;
  }

  const octets = ip.split(".");
  if (octets.length !== 4) {
    return maskIdentifier(ip);
  }

  return `${octets[0]}.${octets[1]}.x.x`;
}

export function maskIdentifier(value: string | null | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.includes("@")) {
    return maskEmail(trimmed);
  }

  if (trimmed.length <= 4) {
    return `${trimmed[0] ?? ""}${"•".repeat(Math.max(3, trimmed.length - 1))}`;
  }

  return `${trimmed.slice(0, 3)}${"•".repeat(Math.max(3, trimmed.length - 3))}`;
}

export function shortenText(value: string | null | undefined, maxLength = 120): string {
  if (!value) return "-";

  const normalized = value.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
}
