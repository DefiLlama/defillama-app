import { YIELDS_SERVER_URL } from '~/constants'
import { fetchWithPoolingOnServer } from '~/utils/http-client'
import { recordRouteRuntimeError } from '~/utils/telemetry'
import { queryString } from '../params'
import { badRequest, ok, upstreamError } from '../respond'
import { cachedResult } from '../resultCache'
import { defineApiRoute } from '../types'

// borrow datasets are served from the in-process dataset cache runtime
// (see server/datasetCache/jsonCache.ts), so they need no extra memoization.
const BORROW_CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=3600'

// chartLendBorrow/holders proxy the yields server directly; holders payloads
// are multi-MB and these routes average multiple seconds, so upstream
// fetch+parse is memoized and concurrent identical requests share one fetch.
const YIELDS_SERVER_CACHE_CONTROL = 'public, s-maxage=3600, stale-while-revalidate=600'
const YIELDS_SERVER_RESULT_TTL_MS = 10 * 60 * 1000

const CONFIG_ID_REGEX = /^[\da-f-]{36}$/i

async function fetchYieldsServerJson(path: string): Promise<unknown> {
	const upstream = await fetchWithPoolingOnServer(`${YIELDS_SERVER_URL}${path}`)
	if (!upstream.ok) {
		throw new Error(`Yields server responded with ${upstream.status} for ${path}`)
	}
	return upstream.json()
}

export const borrowDataset = defineApiRoute({
	route: '/api/public/datasets/borrow',
	cacheControl: BORROW_CACHE_CONTROL,
	handle: async (req) => {
		try {
			const { getBorrowPageRows } = await import('~/server/datasetCache/runtime/yields')
			return ok(await getBorrowPageRows(req.query))
		} catch (error) {
			recordRouteRuntimeError(error, 'apiRoute')
			return upstreamError('Failed to fetch borrow data')
		}
	}
})

export const borrowAdvancedDataset = defineApiRoute({
	route: '/api/public/datasets/borrow-advanced',
	cacheControl: BORROW_CACHE_CONTROL,
	handle: async (req) => {
		try {
			const { getBorrowAdvancedPageRows } = await import('~/server/datasetCache/runtime/yields')
			return ok(await getBorrowAdvancedPageRows(req.query))
		} catch (error) {
			recordRouteRuntimeError(error, 'apiRoute')
			return upstreamError('Failed to fetch borrow advanced data')
		}
	}
})

export const chartLendBorrowDataset = defineApiRoute({
	route: '/api/public/datasets/chartLendBorrow/[configID]',
	cacheControl: YIELDS_SERVER_CACHE_CONTROL,
	handle: async (req) => {
		const configID = queryString(req.query, 'configID')
		if (!configID || !CONFIG_ID_REGEX.test(configID)) {
			return badRequest('Invalid configID')
		}

		try {
			const data = await cachedResult(
				'datasets-chart-lend-borrow',
				configID,
				{ ttlMs: YIELDS_SERVER_RESULT_TTL_MS, ttlJitter: 0.2 },
				() => fetchYieldsServerJson(`/chartLendBorrow/${configID}`)
			)
			return ok(data)
		} catch (error) {
			recordRouteRuntimeError(error, 'apiRoute')
			return upstreamError('Upstream error')
		}
	}
})

export const holdersDataset = defineApiRoute({
	route: '/api/public/datasets/holders',
	cacheControl: YIELDS_SERVER_CACHE_CONTROL,
	handle: async () => {
		try {
			const data = await cachedResult(
				'datasets-holders',
				'/api/public/datasets/holders',
				{ ttlMs: YIELDS_SERVER_RESULT_TTL_MS, ttlJitter: 0.2 },
				() => fetchYieldsServerJson('/holders')
			)
			return ok(data)
		} catch (error) {
			recordRouteRuntimeError(error, 'apiRoute')
			return upstreamError('Upstream error')
		}
	}
})

export const holdersByConfigDataset = defineApiRoute({
	route: '/api/public/datasets/holders/[configID]',
	cacheControl: YIELDS_SERVER_CACHE_CONTROL,
	handle: async (req) => {
		const configID = queryString(req.query, 'configID')
		if (!configID || !CONFIG_ID_REGEX.test(configID)) {
			return badRequest('Invalid configID')
		}

		try {
			const data = await cachedResult(
				'datasets-holders-config',
				configID,
				{ ttlMs: YIELDS_SERVER_RESULT_TTL_MS, ttlJitter: 0.2 },
				() => fetchYieldsServerJson(`/holders/${configID}`)
			)
			return ok(data)
		} catch (error) {
			recordRouteRuntimeError(error, 'apiRoute')
			return upstreamError('Upstream error')
		}
	}
})
