import { createHash, randomBytes, createCipheriv, createDecipheriv } from "crypto";
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
};

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : memoryRedis;

// Derive a 32-byte encryption key from DATA_ENCRYPTION_KEY or AUTH_SECRET
function getEncryptionKey(): Buffer {
  const raw = process.env.DATA_ENCRYPTION_KEY || process.env.AUTH_SECRET || "";
  if (!raw) {
    throw new Error(
      "DATA_ENCRYPTION_KEY or AUTH_SECRET must be set for encryption"
    );
  }
  return createHash("sha256").update(raw).digest();
}

const ENCRYPTION_PREFIX = "enc:";

function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, authTag, encrypted]).toString("base64");
  return ENCRYPTION_PREFIX + payload;
}

function decrypt(encrypted: string): string {
  if (!encrypted.startsWith(ENCRYPTION_PREFIX)) {
    // Plaintext fallback for legacy data
    return encrypted;
  }
  const payload = Buffer.from(encrypted.slice(ENCRYPTION_PREFIX.length), "base64");
  const iv = payload.subarray(0, 16);
  const authTag = payload.subarray(16, 32);
  const ciphertext = payload.subarray(32);
  const key = getEncryptionKey();
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
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

function progressKey(userId: string): string {
  return `progress:${userId}`;
}

export async function loadProgress(userId: string): Promise<ProgressData> {
  const raw = await redis.get<string>(progressKey(userId));
  if (!raw) {
    const initial = createInitialProgress(userId);
    await saveProgress(userId, initial);
    return initial;
  }
  const rawStr = typeof raw === "string" ? raw : JSON.stringify(raw);
  const plaintext = decrypt(rawStr);
  return JSON.parse(plaintext) as ProgressData;
}

export async function saveProgress(
  userId: string,
  progress: ProgressData
): Promise<void> {
  const json = JSON.stringify(progress);
  const ciphertext = encrypt(json);
  await redis.set(progressKey(userId), ciphertext);
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
  day.last_result = result;

  if (result.passed) {
    day.status = "passed";
  } else {
    day.status = "failed_last";
  }

  progress.total_attempts += 1;

  // Unlock next day if passed
  if (result.passed) {
    const nextDay = String(result.day + 1);
    if (progress.weeks[w].days[nextDay]) {
      if (progress.weeks[w].days[nextDay].status === "locked") {
        progress.weeks[w].days[nextDay].status = "available";
      }
    } else {
      // End of week, unlock next week day 1
      const nextWeek = String(result.week + 1);
      if (progress.weeks[nextWeek]) {
        progress.weeks[nextWeek].status = "in_progress";
        if (progress.weeks[nextWeek].days["1"].status === "locked") {
          progress.weeks[nextWeek].days["1"].status = "available";
        }
      }
    }
  }

  // Recalculate week status
  const weekDays = Object.values(progress.weeks[w].days);
  const allPassed = weekDays.every((day) => day.status === "passed");
  if (allPassed) {
    progress.weeks[w].status = "complete";
  } else if (weekDays.some((day) => day.status !== "locked")) {
    progress.weeks[w].status = "in_progress";
  }

  // Streak: count consecutive passed days from day 1 forward
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
    if (weekDays[weekDays.length - 1].status !== "passed") break;
  }
  progress.current_streak_days = streak;

  await saveProgress(userId, progress);
  return progress;
}
