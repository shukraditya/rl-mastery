import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { UpstashRedisAdapter } from "@auth/upstash-redis-adapter";
import type { Redis } from "@upstash/redis";
import { redis } from "@/lib/progress-store";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: UpstashRedisAdapter(redis as Redis),
  providers: [Google],
  session: { strategy: "database" },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
});
