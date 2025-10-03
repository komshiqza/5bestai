export const GLORY_DISTRIBUTION = [0.4, 0.25, 0.15, 0.1, 0.1] as const;

export const CONTEST_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  ENDED: "ended",
} as const;

export const SUBMISSION_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export const USER_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  BANNED: "banned",
} as const;

export const USER_ROLES = {
  USER: "user",
  ADMIN: "admin",
} as const;

export const SUBMISSION_TYPES = {
  IMAGE: "image",
  VIDEO: "video",
} as const;

export const MAX_FILE_SIZE = {
  IMAGE: 10 * 1024 * 1024, // 10MB
  VIDEO: 100 * 1024 * 1024, // 100MB
} as const;

export const VOTING_RATE_LIMIT = {
  MAX_VOTES: 30,
  WINDOW_HOURS: 1,
} as const;
