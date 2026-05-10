import { YIELD_CONFIG_API, YIELD_POOLS_LAMBDA_API } from '~/constants'
import { getTokenBorrowRoutesDataFromNetwork } from '~/containers/Token/tokenBorrowRoutes.server'
import type { TokenBorrowRoutesResponse } from '~/containers/Token/tokenBorrowRoutes.types'
import { getTokenYieldsRowsFromNetwork } from '~/containers/Token/tokenYields.server'
import { buildYieldTableRowsWithBorrowData, mapPoolToYieldTableRow } from '~/containers/Yields/poolsPipeline'
import { fetchYieldConfigFromNetwork, getLendBorrowData, getYieldPageData } from '~/containers/Yields/queries/index'
import type { YieldConfigResponse } from '~/containers/Yields/queries/index'
import type { IYieldTableRow } from '~/containers/Yields/Tables/types'
import { fetchJson } from '~/utils/async'
import {
	getProtocolYieldRowsFromCache,
	getTokenBorrowRoutesFromCache,
	getTokenYieldsRowsFromCache,
	getYieldConfigFromCache,
	getYieldPoolRowFromCache,
	getYieldProtocolConfigFromCache
} from '../yields'
import { readThroughDatasetCache } from './source'

const YIELD_POOL_CONFIG_ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type YieldPoolPageData = {
	pool: IYieldTableRow
	config: any | null
	poolId: string
}

export type YieldPoolPageDataResult = {
	source: 'cache' | 'network'
	data: YieldPoolPageData | null
}

async function getProtocolYieldRowsFromNetwork(protocolSlugs: string[]): Promise<IYieldTableRow[]> {
	const yieldsData = await getYieldPageData()
	const dataBorrow = await getLendBorrowData().catch(() => ({ props: { pools: [] as any[] } }))
	const allRows = buildYieldTableRowsWithBorrowData(yieldsData?.props?.pools ?? [], dataBorrow.props.pools)
	const protocolSlugSet = new Set(protocolSlugs)
	const rows: IYieldTableRow[] = []

	for (const row of allRows) {
		if (protocolSlugSet.has(row.projectslug)) {
			rows.push(row)
		}
	}

	return rows
}

async function getYieldPoolPageDataFromNetwork(poolId: string): Promise<YieldPoolPageData | null> {
	if (!YIELD_POOL_CONFIG_ID_REGEX.test(poolId)) {
		return null
	}

	const poolResponse = await fetchJson<{ data?: any[] }>(`${YIELD_POOLS_LAMBDA_API}?pool=${encodeURIComponent(poolId)}`)
	const rawPool = poolResponse?.data?.[0]
	if (!rawPool) return null

	const yieldConfig = await fetchJson<{ protocols?: Record<string, any> }>(YIELD_CONFIG_API).catch(() => null)
	const config = rawPool.project ? (yieldConfig?.protocols?.[rawPool.project] ?? null) : null

	return {
		pool: mapPoolToYieldTableRow(rawPool),
		config,
		poolId
	}
}

export function getTokenYieldsRows(token: string, chains?: string | string[]): Promise<IYieldTableRow[]> {
	return readThroughDatasetCache({
		domain: 'yields',
		readCache: () => getTokenYieldsRowsFromCache(token, chains),
		readNetwork: () => getTokenYieldsRowsFromNetwork(token, chains)
	})
}

export function getTokenBorrowRoutes(token: string): Promise<TokenBorrowRoutesResponse> {
	return readThroughDatasetCache({
		domain: 'yields',
		readCache: () => getTokenBorrowRoutesFromCache(token),
		readNetwork: () => getTokenBorrowRoutesDataFromNetwork(token)
	})
}

export function getYieldConfig(): Promise<YieldConfigResponse> {
	return readThroughDatasetCache({
		domain: 'yields',
		readCache: getYieldConfigFromCache,
		readNetwork: fetchYieldConfigFromNetwork
	})
}

export function getProtocolYieldRows(protocolSlugs: string[]): Promise<IYieldTableRow[]> {
	return readThroughDatasetCache({
		domain: 'yields',
		readCache: () => getProtocolYieldRowsFromCache(protocolSlugs),
		readNetwork: () => getProtocolYieldRowsFromNetwork(protocolSlugs)
	})
}

export function getYieldPoolPageData(poolId: string): Promise<YieldPoolPageDataResult> {
	return readThroughDatasetCache<YieldPoolPageDataResult>({
		domain: 'yields',
		readCache: async () => {
			const row = await getYieldPoolRowFromCache(poolId)
			return {
				source: 'cache' as const,
				data: row
					? {
							pool: row,
							config: await getYieldProtocolConfigFromCache(row.projectslug),
							poolId
						}
					: null
			}
		},
		readNetwork: async () => ({
			source: 'network' as const,
			data: await getYieldPoolPageDataFromNetwork(poolId)
		})
	})
}
