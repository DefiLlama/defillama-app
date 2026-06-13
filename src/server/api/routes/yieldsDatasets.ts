import { recordRouteRuntimeError } from '~/utils/telemetry'
import { badRequest, ok, upstreamError } from '../respond'
import { defineApiRoute } from '../types'

// All of these read through the dataset cache runtime
// (server/datasetCache/runtime/yields.ts), which already memoizes the heavy
// artifact reads in process with background refresh (jsonCache.ts). The
// per-request work is light query shaping, so no cachedResult here.
const YIELDS_DATASET_CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=3600'

export const yieldsDataset = defineApiRoute({
	route: '/api/public/datasets/yields',
	cacheControl: YIELDS_DATASET_CACHE_CONTROL,
	handle: async (req) => {
		try {
			const { chains, token } = req.query
			const tokenFilter = typeof token === 'string' ? token.trim() : Array.isArray(token) ? token[0]?.trim() : ''
			const { getTokenYieldsRows } = await import('~/server/datasetCache/runtime/yields')
			return ok(await getTokenYieldsRows(tokenFilter, chains))
		} catch (error) {
			recordRouteRuntimeError(error, 'apiRoute')
			return upstreamError('Failed to fetch yields data')
		}
	}
})

export const yieldsTokenBorrowRoutes = defineApiRoute({
	route: '/api/public/datasets/yields-token-borrow-routes',
	cacheControl: YIELDS_DATASET_CACHE_CONTROL,
	handle: async (req) => {
		const tokenQuery = req.query.token
		const token =
			typeof tokenQuery === 'string'
				? tokenQuery.trim().toUpperCase()
				: Array.isArray(tokenQuery)
					? tokenQuery[0]?.trim().toUpperCase()
					: ''

		if (!token) {
			return badRequest('Missing token query param')
		}

		try {
			const { getTokenBorrowRoutes } = await import('~/server/datasetCache/runtime/yields')
			return ok(await getTokenBorrowRoutes(token))
		} catch (error) {
			recordRouteRuntimeError(error, 'apiRoute')
			// Historical contract: token pages key off this exact header to skip
			// client-side retry caching on loader failures.
			return { ...upstreamError('Failed to fetch token borrow routes data'), headers: { 'Cache-Control': 'private, no-store' } }
		}
	}
})

export const yieldsHalalDataset = defineApiRoute({
	route: '/api/public/datasets/yields/halal',
	cacheControl: YIELDS_DATASET_CACHE_CONTROL,
	handle: async (req) => {
		try {
			const { getYieldHalalPage } = await import('~/server/datasetCache/runtime/yields')
			return ok(await getYieldHalalPage(req.query))
		} catch (error) {
			recordRouteRuntimeError(error, 'apiRoute')
			return upstreamError('Failed to fetch halal yield data')
		}
	}
})

export const yieldsLoopDataset = defineApiRoute({
	route: '/api/public/datasets/yields/loop',
	cacheControl: YIELDS_DATASET_CACHE_CONTROL,
	handle: async (req) => {
		try {
			const { getYieldLoopPage } = await import('~/server/datasetCache/runtime/yields')
			return ok(await getYieldLoopPage(req.query))
		} catch (error) {
			recordRouteRuntimeError(error, 'apiRoute')
			return upstreamError('Failed to fetch yield loop data')
		}
	}
})

export const yieldsPoolsDataset = defineApiRoute({
	route: '/api/public/datasets/yields/pools',
	cacheControl: YIELDS_DATASET_CACHE_CONTROL,
	handle: async (req) => {
		try {
			const { getYieldPoolsPage } = await import('~/server/datasetCache/runtime/yields')
			return ok(await getYieldPoolsPage(req.query))
		} catch (error) {
			recordRouteRuntimeError(error, 'apiRoute')
			return upstreamError('Failed to fetch yield pools data')
		}
	}
})

export const yieldsStrategyLongShortDataset = defineApiRoute({
	route: '/api/public/datasets/yields/strategy-long-short',
	cacheControl: YIELDS_DATASET_CACHE_CONTROL,
	handle: async (req) => {
		try {
			const { getYieldLongShortPage } = await import('~/server/datasetCache/runtime/yields')
			return ok(await getYieldLongShortPage(req.query))
		} catch (error) {
			recordRouteRuntimeError(error, 'apiRoute')
			return upstreamError('Failed to fetch yield long short strategy data')
		}
	}
})

export const yieldsStrategyDataset = defineApiRoute({
	route: '/api/public/datasets/yields/strategy',
	cacheControl: YIELDS_DATASET_CACHE_CONTROL,
	handle: async (req) => {
		try {
			const { getYieldStrategyPage } = await import('~/server/datasetCache/runtime/yields')
			return ok(await getYieldStrategyPage(req.query))
		} catch (error) {
			recordRouteRuntimeError(error, 'apiRoute')
			return upstreamError('Failed to fetch yield strategy data')
		}
	}
})
