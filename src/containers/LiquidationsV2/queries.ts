import { fetchBlockExplorers } from '~/api'
import type { BlockExplorersResponse } from '~/api/types'
import { slug } from '~/utils'
import { findBlockExplorerChain } from '~/utils/blockExplorers'
import type { IChainMetadata, IProtocolMetadata } from '~/utils/metadata/types'
import {
	fetchAllLiquidations,
	fetchProtocolChainLiquidations,
	fetchProtocolLiquidations,
	fetchProtocolsList
} from './api'
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
	RawLiquidationPosition
} from './api.types'

interface LiquidationsMetadataCache {
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

function createProtocolMetadataLookup(
	protocolMetadata: Record<string, IProtocolMetadata>
): Map<string, LiquidationsProtocolMetadata> {
	const lookup = new Map<string, LiquidationsProtocolMetadata>()

	for (const metadata of Object.values(protocolMetadata) as LiquidationsProtocolMetadata[]) {
		if (metadata?.name) {
			lookup.set(metadata.name, metadata)
		}
	}

	return lookup
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

function sortByName<T extends { name: string }>(rows: T[]): T[] {
	return rows.sort((a, b) => a.name.localeCompare(b.name))
}

function getProtocolLinks(
	protocolIds: string[],
	protocolMetadataLookup: Map<string, LiquidationsProtocolMetadata>
): NavLink[] {
	const protocolRefs = sortByName(protocolIds.map((protocolId) => getProtocolRef(protocolId, protocolMetadataLookup)))

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
	const chainRefs = sortByName(chainIds.map((chainId) => getChainRef(chainId, chainMetadata)))

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
	totalBins = LIQUIDATIONS_V2_TOTAL_BINS
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
	for (const position of validPositions) {
		const tokenPositions = positionsByToken.get(position.collateral)
		if (tokenPositions) {
			tokenPositions.push(position)
		} else {
			positionsByToken.set(position.collateral, [position])
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

					const binIndex = binSize === 0 ? 0 : Math.min(binCount - 1, Math.floor(position.liqPrice / binSize))
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
				label: tokenKey,
				totalUsd,
				breakdowns: {
					total: buildView(() => ({ key: tokenKey, label: tokenKey })),
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

function resolveProtocolId(
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

function resolveChainId(
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

export async function getLiquidationsOverviewPageData(
	metadataCache: LiquidationsMetadataCache
): Promise<LiquidationsOverviewPageProps> {
	const [protocolsResponse, allResponse] = await Promise.all([fetchProtocolsList(), fetchAllLiquidations()])
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

export async function getLiquidationsProtocolPageData(
	protocolParam: string,
	metadataCache: LiquidationsMetadataCache
): Promise<LiquidationsProtocolPageProps | null> {
	const protocolsResponse = await fetchProtocolsList()
	const protocolMetadataLookup = createProtocolMetadataLookup(metadataCache.protocolMetadata)
	const protocolId = resolveProtocolId(protocolParam, protocolsResponse.protocols, protocolMetadataLookup)

	if (!protocolId) {
		return null
	}

	const [protocolResponse, blockExplorers] = await Promise.all([
		fetchProtocolLiquidations(protocolId),
		fetchBlockExplorers().catch((): BlockExplorersResponse => [])
	])
	const protocol = getProtocolRef(protocolId, protocolMetadataLookup)
	const protocolLinks = getProtocolLinks(protocolsResponse.protocols, protocolMetadataLookup)
	const chainIds = Object.keys(protocolResponse.data)
	const chainLinks = getChainLinks(protocol, chainIds, metadataCache.chainMetadata)
	const ownerBlockExplorers = filterBlockExplorersForChains({
		blockExplorers,
		chainIds,
		chainMetadata: metadataCache.chainMetadata
	})
	const chartPositions: LiquidationPosition[] = []
	const positions: LiquidationPosition[] = []
	const chainRows: ProtocolChainRow[] = []
	let totalCollateralUsd = 0

	for (const chainId of sortByName(chainIds.map((id) => getChainRef(id, metadataCache.chainMetadata))).map(
		(chain) => chain.id
	)) {
		const chain = getChainRef(chainId, metadataCache.chainMetadata)
		const rawPositions = protocolResponse.data[chainId]
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
		timestamp: protocolResponse.timestamp,
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

export async function getLiquidationsChainPageData(
	protocolParam: string,
	chainParam: string,
	metadataCache: LiquidationsMetadataCache
): Promise<LiquidationsChainPageProps | null> {
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

	const [chainResponse, blockExplorers] = await Promise.all([
		fetchProtocolChainLiquidations(protocolId, chainId),
		fetchBlockExplorers().catch((): BlockExplorersResponse => [])
	])
	const protocol = getProtocolRef(protocolId, protocolMetadataLookup)
	const chain = getChainRef(chainId, metadataCache.chainMetadata)
	const protocolLinks = getProtocolLinks(protocolsResponse.protocols, protocolMetadataLookup)
	const chainLinks = getChainLinks(protocol, chainIds, metadataCache.chainMetadata)
	const ownerBlockExplorers = filterBlockExplorersForChains({
		blockExplorers,
		chainIds: [chainId],
		chainMetadata: metadataCache.chainMetadata
	})
	const positions = normalizePositions(protocol, chain, chainResponse.data)
	const chainRows: ProtocolChainRow[] = []

	for (const currentChainId of sortByName(chainIds.map((id) => getChainRef(id, metadataCache.chainMetadata))).map(
		(currentChain) => currentChain.id
	)) {
		const currentChain = getChainRef(currentChainId, metadataCache.chainMetadata)
		const rawPositions = protocolResponse.data[currentChainId]
		const chainPositions = normalizePositions(protocol, currentChain, rawPositions)
		chainRows.push({
			...currentChain,
			protocolId: protocol.id,
			protocolName: protocol.name,
			protocolSlug: protocol.slug,
			positionCount: chainPositions.length,
			collateralCount: getCollateralCount(chainPositions),
			totalCollateralUsd: sumCollateralUsd(rawPositions)
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
		timestamp: chainResponse.timestamp,
		positionCount: positions.length,
		collateralCount: getCollateralCount(positions),
		totalCollateralUsd: sumCollateralUsd(chainResponse.data),
		distributionChart: buildLiquidationsDistributionChart(positions),
		chainRows: sortByCountAndName(chainRows),
		ownerBlockExplorers,
		positions
	}
}
