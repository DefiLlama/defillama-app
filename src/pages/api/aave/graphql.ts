import { spawn } from 'node:child_process'
import { writeFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { NextApiRequest, NextApiResponse } from 'next'
import * as duneCache from '~/utils/dune-cache'

const AAVE_GRAPHQL_URL = 'https://api.v3.aave.com/graphql'

const CHAIN_IDS = [1, 42161, 43114, 8453, 56, 100, 59144, 10, 137, 534352, 146, 324, 9745, 5000, 57073, 1868, 4326, 42220, 1088]
const VALID_CHAIN_IDS = new Set(CHAIN_IDS)
const VALID_WINDOWS = new Set(['LAST_DAY', 'LAST_WEEK', 'LAST_MONTH', 'LAST_SIX_MONTHS', 'LAST_YEAR'])
const HEX_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/

const STATIC_QUERIES: Record<string, string> = {
	markets: `{
		markets(request: { chainIds: [${CHAIN_IDS.join(', ')}] }) {
			name
			address
			chain { chainId name }
			totalMarketSize
			totalAvailableLiquidity
			reserves {
				underlyingToken { symbol name address decimals }
				size { usd }
				usdExchangeRate
				isFrozen isPaused flashLoanEnabled
				supplyInfo {
					apy { value }
					maxLTV { value }
					liquidationThreshold { value }
					liquidationBonus { value }
					canBeCollateral
					supplyCap { usd }
					supplyCapReached
					total { value }
				}
				borrowInfo {
					apy { value }
					total { usd }
					reserveFactor { value }
					availableLiquidity { usd }
					utilizationRate { value }
					borrowCap { usd }
					borrowCapReached
					borrowingState
					baseVariableBorrowRate { value }
					variableRateSlope1 { value }
					variableRateSlope2 { value }
					optimalUsageRate { value }
				}
				incentives {
					... on MeritSupplyIncentive { extraSupplyApr { value } }
					... on AaveSupplyIncentive { extraSupplyApr { value } rewardTokenSymbol }
					... on MeritBorrowIncentive { borrowAprDiscount { value } }
					... on AaveBorrowIncentive { borrowAprDiscount { value } rewardTokenSymbol }
				}
				eModeInfo { categoryId label maxLTV { value } liquidationThreshold { value } }
			}
		}
	}`,
	ghoReserve: `{
		reserve(request: { chainId: 1, market: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2", underlyingToken: "0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f" }) {
			underlyingToken { symbol name address }
			size { usd }
			supplyInfo { apy { value } total { value } supplyCap { usd } }
			borrowInfo { apy { value } total { usd } availableLiquidity { usd } utilizationRate { value } reserveFactor { value } borrowCap { usd } borrowCapReached }
		}
	}`
}

interface ParamQueryParams {
	chainId: number
	market: string
	underlyingToken: string
	window: string
}

function buildParamQuery(queryName: string, params: ParamQueryParams): string | null {
	const { chainId, market, underlyingToken, window } = params
	if (!VALID_CHAIN_IDS.has(chainId)) return null
	if (!HEX_ADDRESS_RE.test(market) || !HEX_ADDRESS_RE.test(underlyingToken)) return null
	if (!VALID_WINDOWS.has(window)) return null

	if (queryName === 'supplyAPYHistory') {
		return `{ supplyAPYHistory(request: { chainId: ${chainId}, market: "${market}", underlyingToken: "${underlyingToken}", window: ${window} }) { date avgRate { value } } }`
	}
	if (queryName === 'borrowAPYHistory') {
		return `{ borrowAPYHistory(request: { chainId: ${chainId}, market: "${market}", underlyingToken: "${underlyingToken}", window: ${window} }) { date avgRate { value } } }`
	}
	return null
}

const PARAM_QUERIES = new Set(['supplyAPYHistory', 'borrowAPYHistory'])
const VALID_QUERIES = new Set([...Object.keys(STATIC_QUERIES), ...PARAM_QUERIES])

const CACHE_TTL_MS = 60 * 60 * 1000
const REDIS_TTL_S = 0
const refreshing = new Set<string>()

function makeCacheKey(queryName: string, params?: ParamQueryParams) {
	if (params) {
		return `aave:graphql:${queryName}:${params.chainId}:${params.market}:${params.underlyingToken}:${params.window}`
	}
	return `aave:graphql:${queryName}`
}

function fetchWithCurl(query: string): Promise<unknown> {
	return new Promise((resolve, reject) => {
		const payload = JSON.stringify({ query })
		const tmpFile = join(tmpdir(), `aave-gql-${Date.now()}-${Math.random().toString(36).slice(2)}.json`)
		writeFileSync(tmpFile, payload)

		const chunks: Buffer[] = []
		const proc = spawn('curl', [
			'-s',
			'-X',
			'POST',
			AAVE_GRAPHQL_URL,
			'-H',
			'Content-Type: application/json',
			'-d',
			`@${tmpFile}`,
			'--max-time',
			'25'
		])

		proc.stdout.on('data', (chunk: Buffer) => chunks.push(chunk))

		proc.on('close', (code) => {
			try {
				unlinkSync(tmpFile)
			} catch {}
			if (code !== 0) return reject(new Error(`curl exited with code ${code}`))
			try {
				resolve(JSON.parse(Buffer.concat(chunks).toString()))
			} catch (e) {
				reject(e)
			}
		})

		proc.on('error', (err) => {
			try {
				unlinkSync(tmpFile)
			} catch {}
			reject(err)
		})
	})
}

function fetchQuery(queryName: string, params?: ParamQueryParams): Promise<unknown> {
	if (params && PARAM_QUERIES.has(queryName)) {
		const query = buildParamQuery(queryName, params)
		if (!query) throw new Error('Invalid parameters')
		return fetchWithCurl(query)
	}
	return fetchWithCurl(STATIC_QUERIES[queryName])
}

function refreshInBackground(queryName: string, key: string, params?: ParamQueryParams) {
	if (refreshing.has(key)) return
	refreshing.add(key)

	fetchQuery(queryName, params)
		.then((data) => duneCache.set(key, { data, fetchedAt: Date.now() }, REDIS_TTL_S))
		.catch(() => {})
		.finally(() => refreshing.delete(key))
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'POST') {
		res.setHeader('Allow', ['POST'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const { queryName, params } = req.body ?? {}
	if (typeof queryName !== 'string' || !VALID_QUERIES.has(queryName)) {
		return res.status(400).json({ error: 'Invalid query name' })
	}

	if (PARAM_QUERIES.has(queryName)) {
		if (!params || typeof params !== 'object') {
			return res.status(400).json({ error: 'Missing params for parameterized query' })
		}
		const query = buildParamQuery(queryName, params)
		if (!query) {
			return res.status(400).json({ error: 'Invalid query parameters' })
		}
	}

	const key = makeCacheKey(queryName, PARAM_QUERIES.has(queryName) ? params : undefined)
	const cached = await duneCache.get<{ data: unknown; fetchedAt: number }>(key)

	if (cached) {
		const ageMs = Date.now() - cached.fetchedAt
		if (ageMs >= CACHE_TTL_MS) refreshInBackground(queryName, key, PARAM_QUERIES.has(queryName) ? params : undefined)
		res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=1800')
		return res.status(200).json(cached.data)
	}

	try {
		const data = await fetchQuery(queryName, PARAM_QUERIES.has(queryName) ? params : undefined)
		await duneCache.set(key, { data, fetchedAt: Date.now() }, REDIS_TTL_S)

		res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=1800')
		return res.status(200).json(data)
	} catch {
		return res.status(500).json({ error: 'Failed to fetch Aave data' })
	}
}
