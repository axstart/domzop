import Redis from "ioredis";

let redis: Redis | null = null;

export function isRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL?.trim());
}

export function getRedis(): Redis {
  if (!isRedisConfigured()) {
    throw new Error("REDIS_URL is not configured");
  }
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
  }
  return redis;
}

async function ensureConnected(client: Redis): Promise<void> {
  if (client.status === "wait" || client.status === "end") {
    await client.connect();
  }
}

export async function enqueuePurchase(candidateId: string, domain: string) {
  if (!isRedisConfigured()) {
    throw new Error("REDIS_URL is not configured");
  }
  const client = getRedis();
  await ensureConnected(client);
  await client.lpush(
    "queue:purchase",
    JSON.stringify({ candidate_id: candidateId, domain, manual: true }),
  );
}

export async function enqueueReport(investorProfileId?: string) {
  if (!isRedisConfigured()) {
    throw new Error("REDIS_URL is not configured");
  }
  const client = getRedis();
  await ensureConnected(client);
  await client.lpush(
    "queue:report",
    JSON.stringify({
      investor_profile_id: investorProfileId ?? null,
      only_available_com: true,
    }),
  );
}

export async function getQueueDepths(): Promise<Record<string, number>> {
  const queues = [
    "queue:discovery",
    "queue:poll",
    "queue:extract_keywords",
    "queue:research",
    "queue:availability",
    "queue:score",
    "queue:report",
    "queue:evaluate",
    "queue:purchase",
  ];
  const empty = Object.fromEntries(queues.map((q) => [q, 0])) as Record<string, number>;
  if (!isRedisConfigured()) return empty;

  const client = getRedis();
  await ensureConnected(client);
  const depths: Record<string, number> = {};
  for (const q of queues) {
    depths[q] = await client.llen(q);
  }
  return depths;
}
