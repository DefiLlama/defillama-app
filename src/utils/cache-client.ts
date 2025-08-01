// let redis = null as null | import('ioredis').Redis
let redis = null
const REDIS_URL = process.env.REDIS_URL as string
const USE_REDIS = !!process.env.USE_REDIS
const EXT_REDIS_URL = process.env.EXT_REDIS_URL as string | undefined
const IS_RUNTIME = !!process.env.IS_RUNTIME

if (typeof window === 'undefined' && USE_REDIS) {
	// Server-side execution

	import('ioredis').then((Redis) => {
		const redisUrl = IS_RUNTIME ? REDIS_URL : EXT_REDIS_URL

		console.log('[cache] [connecting to redis]', redisUrl)

		try {
			redis = redisUrl ? new Redis.default(redisUrl) : null

			redis.on('connect', () => {
				console.log('[cache] [redis] connected')
			})

			redis.on('error', (error) => {
				console.error('[cache] [redis error]', redisUrl)
				console.error(error)
			})
		} catch (e) {
			console.log('[cache] [redis connection error]', e)
		}
	})
}

export const sluggify = (input: string) => {
	const slug = decodeURIComponent(input)
		.toLowerCase()
		.replace(/[^\w\/]+/g, '-')
	return slug.replace(/^-+/, '').replace(/-+$/, '')
}

export const sluggifyProtocol = (input: string) => {
	const slug = decodeURIComponent(input)
		.toLowerCase()
		.replace(/[^\w\/.]+/g, '-')
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

export const setPageBuildTimes = async (pageUrl, cacheObject) => {
	if (!redis) {
		return false
	}

	try {
		await redis.hset('page_build_times', pageUrl, JSON.stringify(cacheObject))
		return true
	} catch (error) {
		console.error('[error] [cache] [failed to set]', cacheObject)
		console.error(error)
		return false
	}
}

export const isCpusHot = async () => {
	return false
	/*
	if (!redis) {
		return false
	}

	try {
		const res = await redis.get('historical_cpu_usage')
		if (res === null) {
			return false
		}
		const usage = JSON.parse(res) as {
			cpusUsage: number[]
			timestamp: number
		}[]

		if (typeof usage !== 'object' || !Array.isArray(usage) || usage.length === 0) {
			return false
		}

		const lastUsage = usage[usage.length - 1]

		// max age = 20 minutes
		if (Date.now() - lastUsage.timestamp > 1000 * 60 * 20) {
			return false
		}

		const hotMoments = usage.some((u) => u.cpusUsage.filter((u) => u > 0.75).length >= 1)
		return hotMoments
	} catch (error) {
		console.error('[error] [cache] [failed to get cpu usage]')
		console.error(error)
		return false
	}
	*/
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

export const setObjectCache = async (key: string, data: any, ttl = 3600) => {
	if (!redis) {
		return false
	}

	try {
		await redis.set(key, JSON.stringify(data), 'EX', ttl)
		return true
	} catch (error) {
		console.error('[error] [cache] [failed to set]', key)
		console.error(error)
		return false
	}
}

export const getObjectCache = async (key: string) => {
	if (!redis) {
		return null
	}

	const res = await redis.get(key)
	return res ? JSON.parse(res) : null
}
