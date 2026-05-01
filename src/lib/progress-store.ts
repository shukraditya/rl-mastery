import { createHash, randomBytes, createCipheriv, createDecipheriv } from "crypto";
import { deflateSync, inflateSync } from "zlib";
import { cache } from "react";
import { Redis } from "@upstash/redis";
import { ProgressData, DayProgress, WeekProgress, QuizResult } from "./types";

const memoryStore = new Map<string, string>();

const memoryRedis = {
  async get<T>(key: string): Promise<T | null> {
    const val = memoryStore.get(key);
    return val ? (JSON.parse(val) as T) : null;
  },
  async set(key: string, value: unknown): Promise<void> {
    memoryStore.set(key, JSON.stringify(value));
  },
  async del(key: string): Promise<void> {
    memoryStore.delete(key);
  },
};

export const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : memoryRedis;

function getEncryptionKey(): Buffer {
  const raw = process.env.DATA_ENCRYPTION_KEY || process.env.AUTH_SECRET || "";
  if (!raw) {
    throw new Error(
      "DATA_ENCRYPTION_KEY or AUTH_SECRET must be set for encryption"
    );
  }
  return createHash("sha256").update(raw).digest();
}

const PREFIX_ENC = "e:";
const PREFIX_ZLIB = "z:";

function pack(data: string): string {
  const compressed = deflateSync(Buffer.from(data, "utf8"));
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const blob = Buffer.concat([iv, authTag, encrypted]).toString("base64");
  return PREFIX_ENC + PREFIX_ZLIB + blob;
}

function unpack(raw: string): string {
  if (!raw.startsWith(PREFIX_ENC)) {
    // Legacy plaintext fallback
    return raw;
  }
  let blob = raw.slice(PREFIX_ENC.length);
  let wasZlib = false;
  if (blob.startsWith(PREFIX_ZLIB)) {
    wasZlib = true;
    blob = blob.slice(PREFIX_ZLIB.length);
  }
  const payload = Buffer.from(blob, "base64");
  const iv = payload.subarray(0, 16);
  const authTag = payload.subarray(16, 32);
  const ciphertext = payload.subarray(32);
  const key = getEncryptionKey();
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  if (wasZlib) {
    return inflateSync(decrypted).toString("utf8");
  }
  return decrypted.toString("utf8");
}

function slimProgress(p: ProgressData): unknown {
  const weeks: Record<string, unknown> = {};
  for (let w = 1; w <= 8; w++) {
    const ws = String(w);
    const days: Record<string, unknown> = {};
    for (let d = 1; d <= 7; d++) {
      const ds = String(d);
      const day = p.weeks[ws]?.days[ds];
      if (!day) continue;
      const s: Record<string, unknown> = {};
      if (day.status !== "locked") s.s = day.status;
      if (day.best_score > 0) s.b = day.best_score;
      if (day.attempts > 0) s.a = day.attempts;
      if (day.last_attempt_at) s.t = day.last_attempt_at;
      if (day.weak_tags.length > 0) s.w = day.weak_tags;
      // last_result is stored separately, never in the progress blob
      if (Object.keys(s).length > 0) days[ds] = s;
    }
    if (Object.keys(days).length > 0) {
      const wsMeta: Record<string, unknown> = { d: days };
      if (p.weeks[ws].status !== "locked") wsMeta.s = p.weeks[ws].status;
      weeks[ws] = wsMeta;
    }
  }
  const out: Record<string, unknown> = { w: weeks };
  if (p.total_attempts > 0) out.t = p.total_attempts;
  if (p.current_streak_days > 0) out.c = p.current_streak_days;
  if (p.started_at) out.r = p.started_at;
  return out;
}

function fattenProgress(userId: string, raw: unknown): ProgressData {
  const s = raw as Record<string, unknown>;
  const weeks: Record<string, WeekProgress> = {};
  for (let w = 1; w <= 8; w++) {
    const ws = String(w);
    const days: Record<string, DayProgress> = {};
    for (let d = 1; d <= 7; d++) {
      days[String(d)] = {
        status: w === 1 && d === 1 ? "available" : "locked",
        best_score: 0,
        attempts: 0,
        last_attempt_at: null,
        weak_tags: [],
      };
    }
    weeks[ws] = { status: w === 1 ? "in_progress" : "locked", days };
  }

  const wks = s.w as Record<string, { s?: string; d: Record<string, { s?: string; b?: number; a?: number; t?: string; w?: string[] }> }> | undefined;
  if (wks) {
    for (const [wk, wv] of Object.entries(wks)) {
      if (weeks[wk]) {
        if (wv.s) weeks[wk].status = wv.s as WeekProgress["status"];
        for (const [dk, dv] of Object.entries(wv.d)) {
          if (weeks[wk].days[dk]) {
            const d = weeks[wk].days[dk];
            if (dv.s) d.status = dv.s as DayProgress["status"];
            if (typeof dv.b === "number") d.best_score = dv.b;
            if (typeof dv.a === "number") d.attempts = dv.a;
            if (dv.t) d.last_attempt_at = dv.t;
            if (Array.isArray(dv.w)) d.weak_tags = dv.w;
          }
        }
      }
    }
  }

  return {
    student_id: userId,
    started_at: (s.r as string) ?? new Date().toISOString(),
    weeks,
    total_attempts: (s.t as number) ?? 0,
    current_streak_days: (s.c as number) ?? 0,
  };
}

function progressKey(userId: string): string {
  return `p:${userId}`;
}

function resultKey(userId: string, week: number, day: number): string {
  return `r:${userId}:${week}:${day}`;
}

export const loadProgress = cache(async (userId: string): Promise<ProgressData> => {
  const raw = await redis.get<string>(progressKey(userId));
  if (!raw) {
    const initial = createInitialProgress(userId);
    await saveProgress(userId, initial);
    return initial;
  }
  const rawStr = typeof raw === "string" ? raw : JSON.stringify(raw);
  const json = unpack(rawStr);
  return fattenProgress(userId, JSON.parse(json));
});

export async function saveProgress(
  userId: string,
  progress: ProgressData
): Promise<void> {
  const json = JSON.stringify(slimProgress(progress));
  const ciphertext = pack(json);
  await redis.set(progressKey(userId), ciphertext);
}

export async function loadResult(
  userId: string,
  week: number,
  day: number
): Promise<QuizResult | null> {
  const raw = await redis.get<string>(resultKey(userId, week, day));
  if (!raw) return null;
  const rawStr = typeof raw === "string" ? raw : JSON.stringify(raw);
  return JSON.parse(unpack(rawStr)) as QuizResult;
}

export async function saveResult(
  userId: string,
  result: QuizResult
): Promise<void> {
  const json = JSON.stringify(result);
  const ciphertext = pack(json);
  await redis.set(resultKey(userId, result.week, result.day), ciphertext);
}

export async function recordAttempt(
  userId: string,
  result: QuizResult
): Promise<ProgressData> {
  const progress = await loadProgress(userId);
  const w = String(result.week);
  const d = String(result.day);

  if (!progress.weeks[w]) {
    throw new Error(`Week ${result.week} not found`);
  }
  if (!progress.weeks[w].days[d]) {
    throw new Error(`Day ${result.day} not found in week ${result.week}`);
  }

  const day = progress.weeks[w].days[d];
  day.attempts += 1;
  day.last_attempt_at = new Date().toISOString();
  day.best_score = Math.max(day.best_score, result.score);
  day.weak_tags = result.weak_tags;

  if (result.passed) {
    day.status = "passed";
  } else {
    day.status = "failed_last";
  }

  progress.total_attempts += 1;

  if (result.passed) {
    const nextDay = String(result.day + 1);
    if (progress.weeks[w].days[nextDay]) {
      if (progress.weeks[w].days[nextDay].status === "locked") {
        progress.weeks[w].days[nextDay].status = "available";
      }
    } else {
      const nextWeek = String(result.week + 1);
      if (progress.weeks[nextWeek]) {
        progress.weeks[nextWeek].status = "in_progress";
        if (progress.weeks[nextWeek].days["1"].status === "locked") {
          progress.weeks[nextWeek].days["1"].status = "available";
        }
      }
    }
  }

  const weekDays = Object.values(progress.weeks[w].days);
  const allPassed = weekDays.every((day) => day.status === "passed");
  if (allPassed) {
    progress.weeks[w].status = "complete";
  } else if (weekDays.some((day) => day.status !== "locked")) {
    progress.weeks[w].status = "in_progress";
  }

  let streak = 0;
  for (let weekNum = 1; weekNum <= 8; weekNum++) {
    const weekStr = String(weekNum);
    if (!progress.weeks[weekStr]) break;
    for (let dayNum = 1; dayNum <= 7; dayNum++) {
      const dayStr = String(dayNum);
      if (progress.weeks[weekStr].days[dayStr]?.status === "passed") {
        streak++;
      } else {
        break;
      }
    }
    const currentWeekDays = Object.values(progress.weeks[weekStr].days);
    if (!currentWeekDays.every((d) => d.status === "passed")) break;
  }
  progress.current_streak_days = streak;

  await Promise.all([
    saveProgress(userId, progress),
    saveResult(userId, result),
  ]);
  return progress;
}

function createInitialProgress(userId: string): ProgressData {
  const weeks: Record<string, WeekProgress> = {};
  for (let w = 1; w <= 8; w++) {
    const days: Record<string, DayProgress> = {};
    for (let d = 1; d <= 7; d++) {
      days[String(d)] = {
        status: w === 1 && d === 1 ? "available" : "locked",
        best_score: 0,
        attempts: 0,
        last_attempt_at: null,
        weak_tags: [],
      };
    }
    weeks[String(w)] = {
      status: w === 1 ? "in_progress" : "locked",
      days,
    };
  }

  return {
    student_id: userId,
    started_at: new Date().toISOString(),
    weeks,
    total_attempts: 0,
    current_streak_days: 0,
  };
}
