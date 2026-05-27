import { fetchCoinGeckoTokensListFromDataset } from '~/api/coingecko'
import { YIELD_CONFIG_API, YIELD_POOLS_LAMBDA_API } from '~/constants'
import { getTokenBorrowRoutesDataFromNetwork } from '~/containers/Token/tokenBorrowRoutes.server'
import type { TokenBorrowRoutesResponse } from '~/containers/Token/tokenBorrowRoutes.types'
import { getTokenYieldsRowsFromNetwork } from '~/containers/Token/tokenYields.server'
import { buildBorrowAdvancedPageMetadata, buildBorrowAdvancedPageRows } from '~/containers/Yields/borrowAdvanced.server'
import { buildBorrowPageMetadata, buildBorrowPageRows } from '~/containers/Yields/borrowSimple.server'
import { buildYieldPoolsPageResponse } from '~/containers/Yields/pools.server'
import { buildYieldTableRowsWithBorrowData, mapPoolToYieldTableRow } from '~/containers/Yields/poolsPipeline'
import {
	fetchYieldConfigFromNetwork,
	getLendBorrowData as getLendBorrowDataFromNetwork,
	getYieldPageData
} from '~/containers/Yields/queries.server'
import type { YieldConfigResponse } from '~/containers/Yields/queries.server'
import type { IYieldTableRow } from '~/containers/Yields/Tables/types'
import { fetchJson } from '~/utils/async'
import { YIELD_POOL_CONFIG_ID_REGEX } from '~/utils/regex-constants'
import { isMissingDatasetArtifactError } from '../core'
import {
	getLendBorrowDataFromCache,
	getProtocolYieldRowsFromCache,
	getTokenBorrowRoutesFromCache,
	getTokenYieldsRowsFromCache,
	getYieldConfigFromCache,
	getYieldPageDataFromCache,
	getYieldPoolRowFromCache,
	getYieldProtocolConfigFromCache
} from '../yields'
import { readThroughDatasetCache } from './source'
import type { YieldPoolPageData, YieldPoolPageDataResult } from './yields.types'

async function getProtocolYieldRowsFromNetwork(protocolSlugs: string[]): Promise<IYieldTableRow[]> {
	const yieldsData = await getYieldPageData()
	const dataBorrow = await getLendBorrowDataFromNetwork().catch(() => ({ props: { pools: [] as any[] } }))
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

function getYieldPageDataThroughCache() {
	return readThroughDatasetCache({
		domain: 'yields',
		readCache: async () => {
			try {
				return await getYieldPageDataFromCache()
			} catch (error) {
				if (isMissingDatasetArtifactError(error)) {
					return getYieldPageData()
				}
				throw error
			}
		},
		readNetwork: getYieldPageData
	})
}

function getLendBorrowData() {
	return readThroughDatasetCache({
		domain: 'yields',
		readCache: getLendBorrowDataFromCache,
		readNetwork: getLendBorrowDataFromNetwork
	})
}

export async function getBorrowAdvancedPageMetadata() {
	const [lendBorrowData, cgList] = await Promise.all([getLendBorrowData(), fetchCoinGeckoTokensListFromDataset()])
	return buildBorrowAdvancedPageMetadata(lendBorrowData, cgList)
}

export async function getBorrowAdvancedPageRows(query: Record<string, string | string[] | undefined>) {
	const lendBorrowData = await getLendBorrowData()
	return buildBorrowAdvancedPageRows(lendBorrowData, query)
}

export async function getBorrowPageMetadata() {
	const [lendBorrowData, cgList] = await Promise.all([getLendBorrowData(), fetchCoinGeckoTokensListFromDataset()])
	return buildBorrowPageMetadata(lendBorrowData, cgList)
}

export async function getBorrowPageRows(query: Record<string, string | string[] | undefined>) {
	const lendBorrowData = await getLendBorrowData()
	return buildBorrowPageRows(lendBorrowData, query)
}

export async function getYieldPoolsPage(query: Record<string, string | string[] | undefined>) {
	const [yieldPageData, lendBorrowData] = await Promise.all([getYieldPageDataThroughCache(), getLendBorrowData()])
	return buildYieldPoolsPageResponse({
		data: yieldPageData.props,
		lendBorrowPools: lendBorrowData.props.pools,
		query
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
