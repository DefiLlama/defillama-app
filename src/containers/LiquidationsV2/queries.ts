import {
	fetchAllLiquidations,
	fetchProtocolChainLiquidations,
	fetchProtocolLiquidations,
	fetchProtocolsList
} from './api'
import type {
	LiquidationPosition,
	LiquidationsChainPageProps,
	LiquidationsOverviewPageProps,
	LiquidationsProtocolPageProps,
	NavLink,
	OverviewChainRow,
	OverviewProtocolRow,
	ProtocolChainRow,
	RawLiquidationPosition
} from './api.types'

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) {
		throw new Error(message)
	}
}

function getProtocolLinks(protocols: string[]): NavLink[] {
	return [
		{ label: 'Overview', to: '/liquidations' },
		...protocols.map((protocol) => ({ label: protocol, to: `/liquidations/${protocol}` }))
	]
}

function getChainLinks(protocol: string, chains: string[]): NavLink[] {
	return [
		{ label: 'All Chains', to: `/liquidations/${protocol}` },
		...chains.map((chain) => ({ label: chain, to: `/liquidations/${protocol}/${chain}` }))
	]
}

function normalizePositions(
	protocol: string,
	chain: string,
	rawPositions: RawLiquidationPosition[]
): LiquidationPosition[] {
	const positions: LiquidationPosition[] = []

	for (const position of rawPositions) {
		const extra = position.extra
		assert(extra?.url, `Missing owner url for ${protocol}/${chain}`)
		positions.push({
			protocol,
			chain,
			owner: position.owner,
			ownerName: extra.displayName ?? position.owner,
			ownerUrl: extra.url,
			liqPrice: position.liqPrice,
			collateral: position.collateral,
			collateralAmount: position.collateralAmount
		})
	}

	return positions
}

function getCollateralCount(positions: LiquidationPosition[]): number {
	const collaterals = new Set<string>()
	for (const position of positions) {
		collaterals.add(position.collateral)
	}
	return collaterals.size
}

function sortByCountAndName<T extends { positionCount: number }>(rows: T[], getName: (row: T) => string): T[] {
	return rows.sort((a, b) => {
		if (b.positionCount !== a.positionCount) return b.positionCount - a.positionCount
		return getName(a).localeCompare(getName(b))
	})
}

export async function getLiquidationsOverviewPageData(): Promise<LiquidationsOverviewPageProps> {
	const [protocolsResponse, allResponse] = await Promise.all([fetchProtocolsList(), fetchAllLiquidations()])
	const protocols = [...protocolsResponse.protocols].sort((a, b) => a.localeCompare(b))
	const protocolLinks = getProtocolLinks(protocols)
	const protocolRows: OverviewProtocolRow[] = []
	const chainMap = new Map<string, OverviewChainRow>()
	const chainCollateralMap = new Map<string, Set<string>>()
	let positionCount = 0

	for (const protocol of protocols) {
		const protocolData = allResponse.data[protocol] ?? {}
		let protocolPositionCount = 0
		const protocolCollaterals = new Set<string>()
		const protocolChains = Object.keys(protocolData)

		for (const chain of protocolChains) {
			const positions = protocolData[chain]
			protocolPositionCount += positions.length
			positionCount += positions.length

			let chainRow = chainMap.get(chain)
			if (!chainRow) {
				chainRow = { chain, positionCount: 0, protocolCount: 0, collateralCount: 0 }
				chainMap.set(chain, chainRow)
			}
			let chainCollaterals = chainCollateralMap.get(chain)
			if (!chainCollaterals) {
				chainCollaterals = new Set<string>()
				chainCollateralMap.set(chain, chainCollaterals)
			}

			chainRow.positionCount += positions.length
			chainRow.protocolCount += 1

			for (const position of positions) {
				protocolCollaterals.add(position.collateral)
				chainCollaterals.add(position.collateral)
			}
			chainRow.collateralCount = chainCollaterals.size
		}

		protocolRows.push({
			protocol,
			positionCount: protocolPositionCount,
			chainCount: protocolChains.length,
			collateralCount: protocolCollaterals.size
		})
	}

	return {
		protocolLinks,
		timestamp: allResponse.timestamp,
		protocolCount: protocols.length,
		chainCount: chainMap.size,
		positionCount,
		protocolRows: sortByCountAndName(protocolRows, (row) => row.protocol),
		chainRows: sortByCountAndName(Array.from(chainMap.values()), (row) => row.chain)
	}
}

export async function getLiquidationsProtocolPageData(protocol: string): Promise<LiquidationsProtocolPageProps | null> {
	const protocolsResponse = await fetchProtocolsList()
	if (!protocolsResponse.protocols.includes(protocol)) {
		return null
	}

	const protocolResponse = await fetchProtocolLiquidations(protocol)
	const protocols = [...protocolsResponse.protocols].sort((a, b) => a.localeCompare(b))
	const chains = Object.keys(protocolResponse.data).sort((a, b) => a.localeCompare(b))
	const protocolLinks = getProtocolLinks(protocols)
	const chainLinks = getChainLinks(protocol, chains)
	const positions: LiquidationPosition[] = []
	const chainRows: ProtocolChainRow[] = []

	for (const chain of chains) {
		const chainPositions = normalizePositions(protocol, chain, protocolResponse.data[chain])
		positions.push(...chainPositions)
		chainRows.push({
			protocol,
			chain,
			positionCount: chainPositions.length,
			collateralCount: getCollateralCount(chainPositions)
		})
	}

	return {
		protocolLinks,
		chainLinks,
		protocol,
		timestamp: protocolResponse.timestamp,
		chainCount: chains.length,
		positionCount: positions.length,
		collateralCount: getCollateralCount(positions),
		chainRows: sortByCountAndName(chainRows, (row) => row.chain),
		positions
	}
}

export async function getLiquidationsChainPageData(
	protocol: string,
	chain: string
): Promise<LiquidationsChainPageProps | null> {
	const protocolsResponse = await fetchProtocolsList()
	if (!protocolsResponse.protocols.includes(protocol)) {
		return null
	}

	const protocolResponse = await fetchProtocolLiquidations(protocol)
	const chains = Object.keys(protocolResponse.data).sort((a, b) => a.localeCompare(b))
	if (!chains.includes(chain)) {
		return null
	}

	const chainResponse = await fetchProtocolChainLiquidations(protocol, chain)
	const protocols = [...protocolsResponse.protocols].sort((a, b) => a.localeCompare(b))
	const protocolLinks = getProtocolLinks(protocols)
	const chainLinks = getChainLinks(protocol, chains)
	const positions = normalizePositions(protocol, chain, chainResponse.data)
	const chainRows: ProtocolChainRow[] = []

	for (const currentChain of chains) {
		const chainPositions = normalizePositions(protocol, currentChain, protocolResponse.data[currentChain])
		chainRows.push({
			protocol,
			chain: currentChain,
			positionCount: chainPositions.length,
			collateralCount: getCollateralCount(chainPositions)
		})
	}

	return {
		protocolLinks,
		chainLinks,
		protocol,
		chain,
		timestamp: chainResponse.timestamp,
		positionCount: positions.length,
		collateralCount: getCollateralCount(positions),
		chainRows: sortByCountAndName(chainRows, (row) => row.chain),
		positions
	}
}
