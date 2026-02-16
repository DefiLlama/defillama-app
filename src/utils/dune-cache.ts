import Redis from 'ioredis'
import { gzip, gunzip } from 'node:zlib'
import { promisify } from 'node:util'

const gzipAsync = promisify(gzip)
const gunzipAsync = promisify(gunzip)

let redis: Redis | null = null

function getRedis() {
	if (!redis && process.env.REDIS_URL) {
		redis = new Redis(process.env.REDIS_URL)
		redis.on('error', () => {})
	}
	return redis
}

export async function get<T = unknown>(key: string): Promise<T | null> {
	const client = getRedis()
	if (!client) return null
	try {
		const res = await client.get(key)
		if (!res) return null
		const buf = Buffer.from(res, 'base64')
		const decompressed = await gunzipAsync(buf)
		return JSON.parse(decompressed.toString()) as T
	} catch {
		return null
	}
}

export async function set(key: string, data: unknown, ttlSeconds: number): Promise<void> {
	const client = getRedis()
	if (!client) return
	try {
		const json = JSON.stringify(data)
		const compressed = await gzipAsync(Buffer.from(json))
		const payload = compressed.toString('base64')
		if (ttlSeconds > 0) {
			await client.set(key, payload, 'EX', ttlSeconds)
		} else {
			await client.set(key, payload)
		}
	} catch {}
}
