import type { Types } from "mongoose";

// ── Result type ──────────────────────────────────────────────────────────────

export type Result<T, E = string> =
  | { success: true; data: T }
  | { success: false; error: E };

export function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

export function err<E = string>(error: E): Result<never, E> {
  return { success: false, error };
}

// ── User ─────────────────────────────────────────────────────────────────────

export interface IUser {
  _id: Types.ObjectId;
  microsoftId: string;
  email: string;
  name: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── OAuth Account ─────────────────────────────────────────────────────────────

export interface IOAuthAccount {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  provider: "microsoft";
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Rule ─────────────────────────────────────────────────────────────────────

export type CategoryPolicy = "add" | "replace" | "remove" | "none";
export type ReadFilter = "read" | "unread" | "any";

export interface RuleConditions {
  senders: string[];
  subjectKeywords: string[];
  bodyKeywords: string[];
  excludeKeywords: string[];
  readFilter: ReadFilter;
  sourceFolders: string[];
}

export interface CategoryAction {
  policy: CategoryPolicy;
  categories: string[];
}

export interface IRule {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  enabled: boolean;
  conditions: RuleConditions;
  targetFolder: string;
  categoryAction: CategoryAction;
  createdAt: Date;
  updatedAt: Date;
}

// ── Execution Log ─────────────────────────────────────────────────────────────

export type LogStatus = "success" | "partial" | "error";

export interface ExecutionStats {
  matched: number;
  moved: number;
  skipped: number;
  failed: number;
}

export interface IExecutionLog {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  ruleId?: Types.ObjectId;
  ruleName?: string;
  status: LogStatus;
  stats: ExecutionStats;
  errorMessage?: string;
  startedAt: Date;
  finishedAt: Date;
  createdAt: Date;
}

// ── Graph API ─────────────────────────────────────────────────────────────────

export interface GraphMessage {
  id: string;
  subject?: string;
  from?: { emailAddress?: { address?: string; name?: string } };
  isRead?: boolean;
  categories?: string[];
  parentFolderId?: string;
  bodyPreview?: string;
  body?: {
    contentType: "text" | "html";
    content: string;
  };
}

export interface GraphFolder {
  id: string;
  displayName: string;
  parentFolderId?: string;
}

// ── Scan / Organize ───────────────────────────────────────────────────────────

export interface ScanOptions {
  ruleId?: string;
  yearFrom?: number;
  yearTo?: number;
  monthsBack?: number;
  preview?: boolean;
}

export interface ScanMatch {
  message: GraphMessage;
  rule: IRule;
}

export interface OrganizeOptions {
  ruleId?: string;
  yearFrom?: number;
  yearTo?: number;
  monthsBack?: number;
  dryRun?: boolean;
}
