let redis = null as null | import('ioredis').Redis
const REDIS_URL = process.env.REDIS_URL as string
const USE_REDIS = !!process.env.USE_REDIS

if (typeof window === 'undefined' && USE_REDIS) {
	// Server-side execution
	const { Redis } = require('ioredis') as typeof import('ioredis')
	console.log('[cache] [connecting to redis]', REDIS_URL)
	redis = REDIS_URL ? new Redis(REDIS_URL) : null

	redis.on('error', (error) => {
		console.error('[cache] [redis error]', REDIS_URL)
		console.error(error)
	})
}

export const sluggify = (input: string) => {
	const slug = decodeURIComponent(input)
		.toLowerCase()
		.replace(/[^\w\/]+/g, '-')
	return slug.replace(/^-+/, '').replace(/-+$/, '')
}

/**
 * RedisCacheObject is the object stored in Redis
 *
 * @property {string} Body - base64 encoded string of the content via Buffer.toString('base64')
 * @property {string} ContentType - the content type of the content, e.g. image/jpeg, text/html, etc.
 */
export type RedisCacheObject = {
	Body: string
	ContentType: string
	StatusCode?: number
	StatusText?: string
}

export type RedisCachePayload = {
	Key: string
	Body: Buffer
	ContentType: string
	StatusCode?: number
	StatusText?: string
}

export const setCache = async (payload: RedisCachePayload, ttl?: string | number) => {
	if (!redis) {
		return false
	}

	try {
		const cacheObject: RedisCacheObject = {
			Body: payload.Body.toString('base64'),
			ContentType: payload.ContentType,
			...(payload.StatusCode ? { StatusCode: payload.StatusCode } : {}),
			...(payload.StatusText ? { StatusText: payload.StatusText } : {})
		}
		if (ttl) {
			await redis.set(payload.Key, JSON.stringify(cacheObject), 'EX', ttl)
		} else {
			await redis.set(payload.Key, JSON.stringify(cacheObject))
		}
		return true
	} catch (error) {
		console.error('[error] [cache] [failed to set]', payload.Key)
		console.error(error)
		return false
	}
}

export const getCpusUsage = async () => {
	if (!redis) {
		return null
	}

	try {
		const res = await redis.get('cpu_usage')
		if (res === null) {
			return null
		}
		const usage = JSON.parse(res) as {
			cpusUsage: number[]
			timestamp: number
		}

		// max age = 20 minutes
		if (Date.now() - usage.timestamp > 1000 * 60 * 20) {
			return null
		}

		return usage.cpusUsage
	} catch (error) {
		console.error('[error] [cache] [failed to get cpu usage]')
		console.error(error)
		return null
	}
}

export const getCache = async (Key: string) => {
	if (!redis) {
		return null
	}

	try {
		const res = await redis.get(Key)
		if (res === null) {
			return null
		}
		const cacheObject: RedisCacheObject = JSON.parse(res)
		const payload = {
			Key,
			Body: Buffer.from(cacheObject.Body, 'base64'),
			ContentType: cacheObject.ContentType,
			...(cacheObject.StatusCode ? { StatusCode: cacheObject.StatusCode } : {}),
			...(cacheObject.StatusText ? { StatusText: cacheObject.StatusText } : {})
		}
		return payload
	} catch (error) {
		console.error('[error] [cache] [failed to get]', Key)
		console.error(error)
		return null
	}
}

export const deleteCache = async (Key: string) => {
	if (!redis) {
		return true
	}

	try {
		await redis.del(Key)
		return true
	} catch (error) {
		console.error('[error] [cache] [failed to delete]', Key)
		console.error(error)
		return false
	}
}
