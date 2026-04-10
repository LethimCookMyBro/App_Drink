import type { FeedbackStatus, FeedbackType } from "@prisma/client";
import {
  decryptOptionalTextAtRest,
  decryptTextAtRest,
  encryptOptionalTextAtRest,
  encryptTextAtRest,
  redactPotentialPII,
} from "@/backend/dataProtection";
import { maskContact } from "@/backend/privacy";

type StoredFeedback = {
  id: string;
  type: FeedbackType;
  title: string;
  details: string | null;
  contact: string | null;
  status: FeedbackStatus;
  createdAt: Date;
  resolvedAt?: Date | null;
};

export function encryptFeedbackFields(input: {
  title: string;
  details?: string | null;
  contact?: string | null;
}) {
  return {
    title: encryptTextAtRest(input.title),
    details: encryptOptionalTextAtRest(input.details),
    contact: encryptOptionalTextAtRest(input.contact),
  };
}

export function decodeStoredFeedback<T extends StoredFeedback>(feedback: T) {
  const title = decryptTextAtRest(feedback.title);
  const details = decryptOptionalTextAtRest(feedback.details);
  const contact = decryptOptionalTextAtRest(feedback.contact);

  return {
    ...feedback,
    title,
    details,
    contact,
  };
}

export function toMaskedFeedbackResponse(feedback: StoredFeedback) {
  const decoded = decodeStoredFeedback(feedback);

  return {
    id: decoded.id,
    type: decoded.type,
    title: redactPotentialPII(decoded.title) || decoded.title,
    details: redactPotentialPII(decoded.details),
    contactMasked: maskContact(decoded.contact),
    hasContact: Boolean(decoded.contact),
    status: decoded.status,
    createdAt: decoded.createdAt,
    ...(decoded.resolvedAt !== undefined
      ? { resolvedAt: decoded.resolvedAt }
      : {}),
  };
}

export function toFeedbackReceiptResponse(feedback: {
  id: string;
  type: FeedbackType;
  status: FeedbackStatus;
  createdAt: Date;
  resolvedAt?: Date | null;
}) {
  return {
    id: feedback.id,
    type: feedback.type,
    status: feedback.status,
    createdAt: feedback.createdAt,
    ...(feedback.resolvedAt !== undefined
      ? { resolvedAt: feedback.resolvedAt }
      : {}),
  };
}
