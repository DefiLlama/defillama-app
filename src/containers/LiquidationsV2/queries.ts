import { fetchBlockExplorers } from '~/api'
import type { BlockExplorersResponse } from '~/api/types'
import { slug } from '~/utils'
import { findBlockExplorerChain } from '~/utils/blockExplorers'
import { normalizeLiquidationsTokenSymbol } from '~/utils/metadata/liquidations'
import type { IChainMetadata, IProtocolMetadata } from '~/utils/metadata/types'
import { fetchAllLiquidations, fetchProtocolLiquidations, fetchProtocolsList } from './api'
import type {
	LiquidationsDistributionChartData,
	LiquidationsDistributionChartSeries,
	LiquidationsDistributionChartView,
	LiquidationsChainPageProps,
	LiquidationsChainRef,
	LiquidationsOverviewPageProps,
	LiquidationsProtocolPageProps,
	LiquidationsProtocolRef,
	LiquidationPosition,
	NavLink,
	OverviewChainRow,
	OverviewProtocolRow,
	ProtocolChainRow,
	RawAllLiquidationsResponse,
	RawLiquidationPosition,
	RawProtocolLiquidationsResponse,
	RawProtocolsResponse,
	TokenLiquidationsSectionData
} from './api.types'
import { createProtocolMetadataLookup } from './protocolMetadata'

export interface LiquidationsMetadataCache {
	chainMetadata: Record<string, IChainMetadata>
	protocolMetadata: Record<string, IProtocolMetadata>
}

type LiquidationsProtocolMetadata = IProtocolMetadata & { name?: string }

interface ChainAggregate {
	chain: LiquidationsChainRef
	positionCount: number
	protocolIds: Set<string>
	collaterals: Set<string>
	totalCollateralUsd: number
}

const LIQUIDATIONS_V2_TOTAL_BINS = 60
const TOKEN_LIQUIDATIONS_CACHE_TTL_MS = 5 * 60 * 1000

type TokenLiquidationsSnapshot = {
	protocolsResponse: Awaited<ReturnType<typeof fetchProtocolsList>>
	allResponse: Awaited<ReturnType<typeof fetchAllLiquidations>>
}

let tokenLiquidationsSnapshotCache: {
	expiresAt: number
	value: TokenLiquidationsSnapshot
} | null = null
let tokenLiquidationsSnapshotInFlight: Promise<TokenLiquidationsSnapshot> | null = null

async function getTokenLiquidationsSnapshot(): Promise<TokenLiquidationsSnapshot> {
	const now = Date.now()
	if (tokenLiquidationsSnapshotCache && now < tokenLiquidationsSnapshotCache.expiresAt) {
		return tokenLiquidationsSnapshotCache.value
	}

	if (tokenLiquidationsSnapshotInFlight) {
		return tokenLiquidationsSnapshotInFlight
	}

	tokenLiquidationsSnapshotInFlight = Promise.all([fetchProtocolsList(), fetchAllLiquidations()])
		.then(([protocolsResponse, allResponse]) => {
			const value = { protocolsResponse, allResponse }
			tokenLiquidationsSnapshotCache = {
				expiresAt: Date.now() + TOKEN_LIQUIDATIONS_CACHE_TTL_MS,
				value
			}
			return value
		})
		.finally(() => {
			tokenLiquidationsSnapshotInFlight = null
		})

	return tokenLiquidationsSnapshotInFlight
}

export function resetTokenLiquidationsSnapshotCache() {
	tokenLiquidationsSnapshotCache = null
	tokenLiquidationsSnapshotInFlight = null
}

function getProtocolRef(
	protocolId: string,
	protocolMetadataLookup: Map<string, LiquidationsProtocolMetadata>
): LiquidationsProtocolRef {
	const name = protocolMetadataLookup.get(protocolId)?.displayName ?? protocolId

	return {
		id: protocolId,
		name,
		slug: slug(name)
	}
}

function getChainRef(chainId: string, chainMetadata: Record<string, IChainMetadata>): LiquidationsChainRef {
	const name = chainMetadata[slug(chainId)]?.name ?? chainId

	return {
		id: chainId,
		name,
		slug: slug(name)
	}
}

function getProtocolLinks(
	protocolIds: string[],
	protocolMetadataLookup: Map<string, LiquidationsProtocolMetadata>
): NavLink[] {
	const protocolRefs = protocolIds.map((protocolId) => getProtocolRef(protocolId, protocolMetadataLookup))

	return [
		{ label: 'Overview', to: '/liquidations' },
		...protocolRefs.map((protocol) => ({ label: protocol.name, to: `/liquidations/${protocol.slug}` }))
	]
}

function getChainLinks(
	protocol: LiquidationsProtocolRef,
	chainIds: string[],
	chainMetadata: Record<string, IChainMetadata>
): NavLink[] {
	const chainRefs = chainIds
		.map((chainId) => getChainRef(chainId, chainMetadata))
		.sort((a, b) => a.name.localeCompare(b.name))

	return getChainLinksFromRefs(protocol, chainRefs)
}

function getChainLinksFromRefs(protocol: LiquidationsProtocolRef, chainRefs: LiquidationsChainRef[]): NavLink[] {
	return [
		{ label: 'All Chains', to: `/liquidations/${protocol.slug}` },
		...chainRefs.map((chain) => ({ label: chain.name, to: `/liquidations/${protocol.slug}/${chain.slug}` }))
	]
}

function normalizePositions(
	protocol: LiquidationsProtocolRef,
	chain: LiquidationsChainRef,
	rawPositions: RawLiquidationPosition[]
): LiquidationPosition[] {
	return rawPositions.map((position) => ({
		protocolId: protocol.id,
		protocolName: protocol.name,
		protocolSlug: protocol.slug,
		chainId: chain.id,
		chainName: chain.name,
		chainSlug: chain.slug,
		owner: position.owner,
		ownerName: position.extra?.displayName ?? position.owner,
		ownerUrlOverride: position.extra?.url ?? null,
		liqPrice: position.liqPrice,
		collateral: position.collateral,
		collateralAmount: position.collateralAmount,
		collateralAmountUsd: position.collateralAmountUsd
	}))
}

function getCollateralCount(positions: Array<{ collateral: string }>): number {
	const collaterals = new Set<string>()
	for (const position of positions) {
		collaterals.add(position.collateral)
	}
	return collaterals.size
}

function sumCollateralUsd(positions: RawLiquidationPosition[]): number {
	return positions.reduce((total, position) => total + position.collateralAmountUsd, 0)
}

function buildLiquidationsDistributionChart(
	positions: Array<
		Pick<
			LiquidationPosition,
			'liqPrice' | 'collateral' | 'collateralAmount' | 'collateralAmountUsd' | 'protocolName' | 'chainName'
		>
	>,
	totalBins = LIQUIDATIONS_V2_TOTAL_BINS,
	getTokenIdentity: (position: Pick<LiquidationPosition, 'collateral'>) => { key: string; label: string } = (
		position
	) => ({ key: position.collateral, label: position.collateral })
): LiquidationsDistributionChartData {
	const validPositions = positions.filter(
		(position) =>
			Number.isFinite(position.liqPrice) &&
			position.liqPrice >= 0 &&
			Number.isFinite(position.collateralAmount) &&
			Number.isFinite(position.collateralAmountUsd) &&
			(position.collateralAmount > 0 || position.collateralAmountUsd > 0)
	)

	if (validPositions.length === 0) {
		return { tokens: [] }
	}

	const positionsByToken = new Map<string, typeof validPositions>()
	const tokenLabelsByKey = new Map<string, string>()
	for (const position of validPositions) {
		const token = getTokenIdentity(position)
		tokenLabelsByKey.set(token.key, token.label)
		const tokenPositions = positionsByToken.get(token.key)
		if (tokenPositions) {
			tokenPositions.push(position)
		} else {
			positionsByToken.set(token.key, [position])
		}
	}

	const tokens = Array.from(positionsByToken.entries())
		.map(([tokenKey, tokenPositions]) => {
			let maxPrice = 0
			for (const position of tokenPositions) {
				if (position.liqPrice > maxPrice) {
					maxPrice = position.liqPrice
				}
			}

			const binCount = Math.max(1, totalBins)
			const priceCeiling = maxPrice > 0 ? maxPrice : 1
			const binSize = priceCeiling / binCount
			const bins = Array.from({ length: binCount }, (_, index) => index * binSize)

			const buildBreakdownSeries = (
				getSeriesKey: (position: (typeof tokenPositions)[number]) => { key: string; label: string }
			): LiquidationsDistributionChartSeries[] => {
				const seriesByKey = new Map<string, LiquidationsDistributionChartSeries>()

				for (const position of tokenPositions) {
					const { key, label } = getSeriesKey(position)
					let series = seriesByKey.get(key)
					if (!series) {
						series = {
							key,
							label,
							usd: new Array(binCount).fill(0),
							amount: new Array(binCount).fill(0),
							totalUsd: 0
						}
						seriesByKey.set(key, series)
					}

					const binIndex = Math.min(binCount - 1, Math.floor(position.liqPrice / binSize))
					series.usd[binIndex] += position.collateralAmountUsd
					series.amount[binIndex] += position.collateralAmount
					series.totalUsd += position.collateralAmountUsd
				}

				return Array.from(seriesByKey.values()).sort((a, b) => {
					if (b.totalUsd !== a.totalUsd) return b.totalUsd - a.totalUsd
					return a.label.localeCompare(b.label)
				})
			}

			const buildView = (
				getSeriesKey: (position: (typeof tokenPositions)[number]) => { key: string; label: string }
			): LiquidationsDistributionChartView => ({
				bins,
				series: buildBreakdownSeries(getSeriesKey)
			})

			const totalUsd = tokenPositions.reduce((sum, position) => sum + position.collateralAmountUsd, 0)

			return {
				key: tokenKey,
				label: tokenLabelsByKey.get(tokenKey) ?? tokenKey,
				totalUsd,
				breakdowns: {
					total: buildView(() => ({ key: tokenKey, label: tokenLabelsByKey.get(tokenKey) ?? tokenKey })),
					protocol: buildView((position) => ({ key: position.protocolName, label: position.protocolName })),
					chain: buildView((position) => ({ key: position.chainName, label: position.chainName }))
				}
			}
		})
		.sort((a, b) => {
			if (b.totalUsd !== a.totalUsd) return b.totalUsd - a.totalUsd
			return a.label.localeCompare(b.label)
		})

	return {
		tokens
	}
}

function sortByCountAndName<T extends { positionCount: number; name: string }>(rows: T[]): T[] {
	return rows.sort((a, b) => {
		if (b.positionCount !== a.positionCount) return b.positionCount - a.positionCount
		return a.name.localeCompare(b.name)
	})
}

export function resolveProtocolId(
	protocolParam: string,
	availableProtocolIds: string[],
	protocolMetadataLookup: Map<string, LiquidationsProtocolMetadata>
): string | null {
	const normalizedProtocolParam = slug(protocolParam)

	for (const protocolId of availableProtocolIds) {
		const protocol = getProtocolRef(protocolId, protocolMetadataLookup)
		if (protocol.slug === normalizedProtocolParam || slug(protocolId) === normalizedProtocolParam) {
			return protocolId
		}
	}

	return null
}

export function resolveChainId(
	chainParam: string,
	availableChainIds: string[],
	chainMetadata: Record<string, IChainMetadata>
): string | null {
	const normalizedChainParam = slug(chainParam)

	for (const chainId of availableChainIds) {
		const chain = getChainRef(chainId, chainMetadata)
		if (chain.slug === normalizedChainParam || slug(chainId) === normalizedChainParam) {
			return chainId
		}
	}

	return null
}

function filterBlockExplorersForChains({
	blockExplorers,
	chainIds,
	chainMetadata
}: {
	blockExplorers: BlockExplorersResponse
	chainIds: string[]
	chainMetadata: Record<string, IChainMetadata>
}): BlockExplorersResponse {
	return blockExplorers.filter((entry) =>
		chainIds.some(
			(chainId) =>
				findBlockExplorerChain([entry], {
					chainId,
					chainName: getChainRef(chainId, chainMetadata).name
				}) != null
		)
	)
}

export function buildLiquidationsOverviewPageData(
	protocolsResponse: RawProtocolsResponse,
	allResponse: RawAllLiquidationsResponse,
	metadataCache: LiquidationsMetadataCache
): LiquidationsOverviewPageProps {
	const protocolIds = protocolsResponse.protocols
	const protocolMetadataLookup = createProtocolMetadataLookup(metadataCache.protocolMetadata)
	const protocolLinks = getProtocolLinks(protocolIds, protocolMetadataLookup)
	const protocolRows: OverviewProtocolRow[] = []
	const chainMap = new Map<string, ChainAggregate>()
	const chartPositions: LiquidationPosition[] = []
	let positionCount = 0
	let totalCollateralUsd = 0

	for (const protocolId of protocolIds) {
		const protocol = getProtocolRef(protocolId, protocolMetadataLookup)
		const protocolData = allResponse.data[protocolId] ?? {}
		let protocolPositionCount = 0
		let protocolTotalCollateralUsd = 0
		const protocolCollaterals = new Set<string>()
		const protocolChainIds = Object.keys(protocolData)

		for (const chainId of protocolChainIds) {
			const chain = getChainRef(chainId, metadataCache.chainMetadata)
			const positions = protocolData[chainId]
			const normalizedChainPositions = normalizePositions(protocol, chain, positions)
			const chainCollateralUsd = sumCollateralUsd(positions)
			chartPositions.push(...normalizedChainPositions)
			protocolPositionCount += positions.length
			positionCount += positions.length
			protocolTotalCollateralUsd += chainCollateralUsd
			totalCollateralUsd += chainCollateralUsd

			let chainAggregate = chainMap.get(chain.id)
			if (!chainAggregate) {
				chainAggregate = {
					chain,
					positionCount: 0,
					protocolIds: new Set<string>(),
					collaterals: new Set<string>(),
					totalCollateralUsd: 0
				}
				chainMap.set(chain.id, chainAggregate)
			}

			chainAggregate.positionCount += positions.length
			chainAggregate.protocolIds.add(protocol.id)
			chainAggregate.totalCollateralUsd += chainCollateralUsd

			for (const position of positions) {
				protocolCollaterals.add(position.collateral)
				chainAggregate.collaterals.add(position.collateral)
			}
		}

		protocolRows.push({
			...protocol,
			positionCount: protocolPositionCount,
			chainCount: protocolChainIds.length,
			collateralCount: protocolCollaterals.size,
			totalCollateralUsd: protocolTotalCollateralUsd
		})
	}

	return {
		protocolLinks,
		timestamp: allResponse.timestamp,
		protocolCount: protocolIds.length,
		chainCount: chainMap.size,
		positionCount,
		totalCollateralUsd,
		distributionChart: buildLiquidationsDistributionChart(chartPositions),
		protocolRows: sortByCountAndName(protocolRows),
		chainRows: sortByCountAndName(
			Array.from(chainMap.values()).map(
				(chainAggregate): OverviewChainRow => ({
					...chainAggregate.chain,
					positionCount: chainAggregate.positionCount,
					protocolCount: chainAggregate.protocolIds.size,
					collateralCount: chainAggregate.collaterals.size,
					totalCollateralUsd: chainAggregate.totalCollateralUsd
				})
			)
		)
	}
}

export function buildTokenLiquidationsSectionData(
	tokenSymbol: string,
	protocolsResponse: RawProtocolsResponse,
	allResponse: RawAllLiquidationsResponse,
	metadataCache: LiquidationsMetadataCache
): TokenLiquidationsSectionData | null {
	const normalizedTokenSymbol = normalizeLiquidationsTokenSymbol(tokenSymbol)
	if (!normalizedTokenSymbol) {
		return null
	}

	const protocolMetadataLookup = createProtocolMetadataLookup(metadataCache.protocolMetadata)
	const protocolRows: OverviewProtocolRow[] = []
	const chainMap = new Map<string, ChainAggregate>()
	const chartPositions: LiquidationPosition[] = []
	let positionCount = 0
	let totalCollateralUsd = 0

	for (const protocolId of protocolsResponse.protocols) {
		const protocol = getProtocolRef(protocolId, protocolMetadataLookup)
		const protocolData = allResponse.data[protocolId] ?? {}
		let protocolPositionCount = 0
		let protocolTotalCollateralUsd = 0
		const protocolChains = new Set<string>()
		const protocolCollaterals = new Set<string>()

		for (const [chainId, rawPositions] of Object.entries(protocolData)) {
			const chainTokenMap = allResponse.tokens[chainId] ?? {}
			const matchedPositions = rawPositions.filter((position) => {
				const token = chainTokenMap[position.collateral]
				return normalizeLiquidationsTokenSymbol(token?.symbol) === normalizedTokenSymbol
			})

			if (matchedPositions.length === 0) {
				continue
			}

			const chain = getChainRef(chainId, metadataCache.chainMetadata)
			const normalizedPositions = normalizePositions(protocol, chain, matchedPositions)
			const chainCollateralUsd = sumCollateralUsd(matchedPositions)

			protocolPositionCount += matchedPositions.length
			protocolTotalCollateralUsd += chainCollateralUsd
			positionCount += matchedPositions.length
			totalCollateralUsd += chainCollateralUsd
			protocolChains.add(chain.id)
			chartPositions.push(...normalizedPositions)

			let chainAggregate = chainMap.get(chain.id)
			if (!chainAggregate) {
				chainAggregate = {
					chain,
					positionCount: 0,
					protocolIds: new Set<string>(),
					collaterals: new Set<string>(),
					totalCollateralUsd: 0
				}
				chainMap.set(chain.id, chainAggregate)
			}

			chainAggregate.positionCount += matchedPositions.length
			chainAggregate.protocolIds.add(protocol.id)
			chainAggregate.totalCollateralUsd += chainCollateralUsd
			chainAggregate.collaterals.add(normalizedTokenSymbol)
			protocolCollaterals.add(normalizedTokenSymbol)
		}

		if (protocolPositionCount > 0) {
			protocolRows.push({
				...protocol,
				positionCount: protocolPositionCount,
				chainCount: protocolChains.size,
				collateralCount: protocolCollaterals.size,
				totalCollateralUsd: protocolTotalCollateralUsd
			})
		}
	}

	if (positionCount === 0) {
		return null
	}

	return {
		tokenSymbol: normalizedTokenSymbol,
		timestamp: allResponse.timestamp,
		positionCount,
		protocolCount: protocolRows.length,
		chainCount: chainMap.size,
		totalCollateralUsd,
		distributionChart: buildLiquidationsDistributionChart(chartPositions, LIQUIDATIONS_V2_TOTAL_BINS, () => ({
			key: normalizedTokenSymbol,
			label: normalizedTokenSymbol
		})),
		protocolRows: sortByCountAndName(protocolRows),
		chainRows: sortByCountAndName(
			Array.from(chainMap.values()).map(
				(chainAggregate): OverviewChainRow => ({
					...chainAggregate.chain,
					positionCount: chainAggregate.positionCount,
					protocolCount: chainAggregate.protocolIds.size,
					collateralCount: chainAggregate.collaterals.size,
					totalCollateralUsd: chainAggregate.totalCollateralUsd
				})
			)
		)
	}
}

export function buildLiquidationsProtocolPageData(
	protocolId: string,
	protocolIds: string[],
	protocolData: RawProtocolLiquidationsResponse['data'],
	timestamp: number,
	blockExplorers: BlockExplorersResponse,
	metadataCache: LiquidationsMetadataCache
): LiquidationsProtocolPageProps {
	const protocolMetadataLookup = createProtocolMetadataLookup(metadataCache.protocolMetadata)
	const protocol = getProtocolRef(protocolId, protocolMetadataLookup)
	const protocolLinks = getProtocolLinks(protocolIds, protocolMetadataLookup)
	const chainIds = Object.keys(protocolData)
	const chainRefs = chainIds
		.map((chainId) => getChainRef(chainId, metadataCache.chainMetadata))
		.sort((a, b) => a.name.localeCompare(b.name))
	const chainLinks = getChainLinksFromRefs(protocol, chainRefs)
	const ownerBlockExplorers = filterBlockExplorersForChains({
		blockExplorers,
		chainIds,
		chainMetadata: metadataCache.chainMetadata
	})
	const chartPositions: LiquidationPosition[] = []
	const positions: LiquidationPosition[] = []
	const chainRows: ProtocolChainRow[] = []
	let totalCollateralUsd = 0

	for (const chain of chainRefs) {
		const rawPositions = protocolData[chain.id]
		const chainPositions = normalizePositions(protocol, chain, rawPositions)
		chartPositions.push(...chainPositions)
		const chainCollateralUsd = sumCollateralUsd(rawPositions)
		positions.push(...chainPositions)
		totalCollateralUsd += chainCollateralUsd
		chainRows.push({
			...chain,
			protocolId: protocol.id,
			protocolName: protocol.name,
			protocolSlug: protocol.slug,
			positionCount: chainPositions.length,
			collateralCount: getCollateralCount(chainPositions),
			totalCollateralUsd: chainCollateralUsd
		})
	}

	return {
		protocolLinks,
		chainLinks,
		protocolId: protocol.id,
		protocolName: protocol.name,
		protocolSlug: protocol.slug,
		timestamp,
		chainCount: chainIds.length,
		positionCount: positions.length,
		collateralCount: getCollateralCount(positions),
		totalCollateralUsd,
		distributionChart: buildLiquidationsDistributionChart(chartPositions),
		chainRows: sortByCountAndName(chainRows),
		ownerBlockExplorers,
		positions
	}
}

export function buildLiquidationsChainPageData(
	protocolId: string,
	chainId: string,
	protocolIds: string[],
	protocolData: RawProtocolLiquidationsResponse['data'],
	timestamp: number,
	blockExplorers: BlockExplorersResponse,
	metadataCache: LiquidationsMetadataCache
): LiquidationsChainPageProps {
	const protocolMetadataLookup = createProtocolMetadataLookup(metadataCache.protocolMetadata)
	const protocol = getProtocolRef(protocolId, protocolMetadataLookup)
	const chainIds = Object.keys(protocolData)
	const chain = getChainRef(chainId, metadataCache.chainMetadata)
	const protocolLinks = getProtocolLinks(protocolIds, protocolMetadataLookup)
	const chainLinks = getChainLinks(protocol, chainIds, metadataCache.chainMetadata)
	const ownerBlockExplorers = filterBlockExplorersForChains({
		blockExplorers,
		chainIds: [chainId],
		chainMetadata: metadataCache.chainMetadata
	})
	const chainPositions = protocolData[chainId] ?? []
	const positions = normalizePositions(protocol, chain, chainPositions)
	const chainRows: ProtocolChainRow[] = []

	const sortedChainRefs = chainIds
		.map((id) => getChainRef(id, metadataCache.chainMetadata))
		.sort((a, b) => a.name.localeCompare(b.name))

	for (const currentChain of sortedChainRefs) {
		const currentChainPositions = protocolData[currentChain.id]
		chainRows.push({
			...currentChain,
			protocolId: protocol.id,
			protocolName: protocol.name,
			protocolSlug: protocol.slug,
			positionCount: currentChainPositions.length,
			collateralCount: getCollateralCount(currentChainPositions),
			totalCollateralUsd: sumCollateralUsd(currentChainPositions)
		})
	}

	return {
		protocolLinks,
		chainLinks,
		protocolId: protocol.id,
		protocolName: protocol.name,
		protocolSlug: protocol.slug,
		chainId: chain.id,
		chainName: chain.name,
		chainSlug: chain.slug,
		timestamp,
		positionCount: positions.length,
		collateralCount: getCollateralCount(positions),
		totalCollateralUsd: sumCollateralUsd(chainPositions),
		distributionChart: buildLiquidationsDistributionChart(positions),
		chainRows: sortByCountAndName(chainRows),
		ownerBlockExplorers,
		positions
	}
}

export async function getLiquidationsOverviewPageDataFromNetwork(
	metadataCache: LiquidationsMetadataCache
): Promise<LiquidationsOverviewPageProps> {
	const [protocolsResponse, allResponse] = await Promise.all([fetchProtocolsList(), fetchAllLiquidations()])
	return buildLiquidationsOverviewPageData(protocolsResponse, allResponse, metadataCache)
}

export async function getTokenLiquidationsSectionDataFromNetwork(
	tokenSymbol: string,
	metadataCache: LiquidationsMetadataCache
): Promise<TokenLiquidationsSectionData | null> {
	const { protocolsResponse, allResponse } = await getTokenLiquidationsSnapshot()
	return buildTokenLiquidationsSectionData(tokenSymbol, protocolsResponse, allResponse, metadataCache)
}

export async function getLiquidationsProtocolPageDataFromNetwork(
	protocolParam: string,
	metadataCache: LiquidationsMetadataCache
): Promise<LiquidationsProtocolPageProps | null> {
	const blockExplorersPromise = fetchBlockExplorers().catch((): BlockExplorersResponse => [])
	const protocolsResponse = await fetchProtocolsList()
	const protocolMetadataLookup = createProtocolMetadataLookup(metadataCache.protocolMetadata)
	const protocolId = resolveProtocolId(protocolParam, protocolsResponse.protocols, protocolMetadataLookup)

	if (!protocolId) {
		return null
	}

	const [protocolResponse, blockExplorers] = await Promise.all([
		fetchProtocolLiquidations(protocolId),
		blockExplorersPromise
	])

	return buildLiquidationsProtocolPageData(
		protocolId,
		protocolsResponse.protocols,
		protocolResponse.data,
		protocolResponse.timestamp,
		blockExplorers,
		metadataCache
	)
}

export async function getLiquidationsChainPageDataFromNetwork(
	protocolParam: string,
	chainParam: string,
	metadataCache: LiquidationsMetadataCache
): Promise<LiquidationsChainPageProps | null> {
	const blockExplorersPromise = fetchBlockExplorers().catch((): BlockExplorersResponse => [])
	const protocolsResponse = await fetchProtocolsList()
	const protocolMetadataLookup = createProtocolMetadataLookup(metadataCache.protocolMetadata)
	const protocolId = resolveProtocolId(protocolParam, protocolsResponse.protocols, protocolMetadataLookup)

	if (!protocolId) {
		return null
	}

	const protocolResponse = await fetchProtocolLiquidations(protocolId)
	const chainIds = Object.keys(protocolResponse.data)
	const chainId = resolveChainId(chainParam, chainIds, metadataCache.chainMetadata)

	if (!chainId) {
		return null
	}

	const blockExplorers = await blockExplorersPromise

	return buildLiquidationsChainPageData(
		protocolId,
		chainId,
		protocolsResponse.protocols,
		protocolResponse.data,
		protocolResponse.timestamp,
		blockExplorers,
		metadataCache
	)
}

export async function getLiquidationsOverviewPageData(
	metadataCache: LiquidationsMetadataCache
): Promise<LiquidationsOverviewPageProps> {
	return getLiquidationsOverviewPageDataFromNetwork(metadataCache)
}

export async function getTokenLiquidationsSectionData(
	tokenSymbol: string,
	metadataCache: LiquidationsMetadataCache
): Promise<TokenLiquidationsSectionData | null> {
	return getTokenLiquidationsSectionDataFromNetwork(tokenSymbol, metadataCache)
}

export async function getLiquidationsProtocolPageData(
	protocolParam: string,
	metadataCache: LiquidationsMetadataCache
): Promise<LiquidationsProtocolPageProps | null> {
	return getLiquidationsProtocolPageDataFromNetwork(protocolParam, metadataCache)
}

export async function getLiquidationsChainPageData(
	protocolParam: string,
	chainParam: string,
	metadataCache: LiquidationsMetadataCache
): Promise<LiquidationsChainPageProps | null> {
	return getLiquidationsChainPageDataFromNetwork(protocolParam, chainParam, metadataCache)
}
