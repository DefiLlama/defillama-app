import { fetchCoinPrices } from '~/api/pricing'
import { fetchAdapterChainMetrics } from '~/containers/AdapterMetrics/api'
import type { IAdapterChainMetrics } from '~/containers/AdapterMetrics/api.types'
import { getAdapterChainOverview } from '~/containers/AdapterMetrics/queries'
import type { IAdapterChainOverview } from '~/containers/AdapterMetrics/types'
import { getProtocolEmissionsLookupFromAggregated } from '~/containers/Incentives/queries'
import type { ProtocolEmissionsLookup } from '~/containers/Incentives/types'
import { fetchProtocols } from '~/containers/ProtocolLists/api'
import type { ProtocolsResponse } from '~/containers/ProtocolLists/api.types'
import { TVL_SETTINGS_KEYS_SET } from '~/contexts/LocalStorage'
import { formatNum, getAnnualizedRatio, getPercentChange, slug } from '~/utils'
import type { IChainMetadata, IProtocolMetadata, ProtocolLlamaswapMetadata } from '~/utils/metadata/types'
import type { IChildProtocol, ILiteProtocol, IProtocol, TVL_TYPES } from './types'
import { toFilterProtocol, toStrikeTvl } from './utils'

export const getProtocolsByChain = async ({
	chain,
	chainMetadata,
	protocolMetadata,
	protocolLlamaswapDataset = null,
	shouldFetchDexs,
	oracle = null,
	fork = null
}: {
	chain: string
	chainMetadata: Record<string, IChainMetadata>
	protocolMetadata: Record<string, IProtocolMetadata>
	protocolLlamaswapDataset?: ProtocolLlamaswapMetadata | null
	shouldFetchDexs?: boolean
	oracle?: string | null
	fork?: string | null
}) => {
	const currentChainMetadata: IChainMetadata =
		chain === 'All'
			? { name: 'All', stablecoins: true, fees: true, dexs: true, perps: true, id: 'all' }
			: chainMetadata[slug(chain)]

	if (!currentChainMetadata) return null
	const shouldFetchDexsForChain = shouldFetchDexs ?? !!currentChainMetadata.dexs

	const normalizedOracle = oracle ? slug(oracle) : null
	const normalizedFork = fork ? slug(fork) : null

	const protocolMatchesForkFilter = (protocol: ILiteProtocol): boolean => {
		if (!normalizedFork) return true

		const forkedFrom = protocol.forkedFrom
		if (!forkedFrom) return false
		for (const forkName of forkedFrom) {
			if (slug(forkName) === normalizedFork) return true
		}
		return false
	}

	const protocolMatchesOracleFilter = (protocol: ILiteProtocol): boolean => {
		if (!normalizedOracle) return true

		const oraclesByChain = protocol.oraclesByChain
		let hasOraclesByChain = false
		for (const _chain in oraclesByChain) {
			hasOraclesByChain = true
			break
		}

		if (hasOraclesByChain) {
			if (chain !== 'All') {
				const normalizedChainName = slug(currentChainMetadata.name)
				for (const chainName in oraclesByChain) {
					if (slug(chainName) !== normalizedChainName) continue
					const oracleNames = oraclesByChain[chainName]
					for (const oracleName of oracleNames) {
						if (slug(oracleName) === normalizedOracle) return true
					}
					return false
				}
				return false
			}

			for (const chainName in oraclesByChain) {
				const oracleNames = oraclesByChain[chainName]
				for (const oracleName of oracleNames) {
					if (slug(oracleName) === normalizedOracle) return true
				}
			}
			return false
		}

		return (protocol.oracles ?? []).some((oracleName) => slug(oracleName) === normalizedOracle)
	}

	const [{ protocols, chains, parentProtocols }, fees, revenue, holdersRevenue, dexs, emissionsProtocols]: [
		ProtocolsResponse,
		IAdapterChainMetrics | null,
		IAdapterChainMetrics | null,
		IAdapterChainMetrics | null,
		IAdapterChainOverview | null,
		ProtocolEmissionsLookup
	] = await Promise.all([
		fetchProtocols(),
		currentChainMetadata.fees
			? fetchAdapterChainMetrics({
					adapterType: 'fees',
					chain: currentChainMetadata.name
				})
			: Promise.resolve(null),
		currentChainMetadata.fees
			? fetchAdapterChainMetrics({
					adapterType: 'fees',
					chain: currentChainMetadata.name,
					dataType: 'dailyRevenue'
				})
			: Promise.resolve(null),
		currentChainMetadata.fees
			? fetchAdapterChainMetrics({
					adapterType: 'fees',
					chain: currentChainMetadata.name,
					dataType: 'dailyHoldersRevenue'
				})
			: Promise.resolve(null),
		shouldFetchDexsForChain
			? getAdapterChainOverview({
					adapterType: 'dexs',
					chain: currentChainMetadata.name,
					excludeTotalDataChart: false
				})
			: Promise.resolve(null),
		getProtocolEmissionsLookupFromAggregated().catch((err) => {
			console.log(err)
			return {}
		})
	])

	const parentProtocolsMap = new Map(parentProtocols.map((parentProtocol) => [parentProtocol.id, parentProtocol]))
	const eligibleProtocols = protocols.filter(
		(protocol) =>
			!protocol.defillamaId.startsWith('chain#') &&
			protocolMetadata[protocol.defillamaId] &&
			protocolMatchesForkFilter(protocol) &&
			protocolMatchesOracleFilter(protocol) &&
			toFilterProtocol({
				protocolMetadata: protocolMetadata[protocol.defillamaId],
				protocolData: protocol,
				chainDisplayName: currentChainMetadata.name
			})
	)

	const geckoIds = new Set<string>()
	for (const protocol of eligibleProtocols) {
		if (protocol.geckoId) {
			geckoIds.add(`coingecko:${protocol.geckoId}`)
		}

		if (protocol.parentProtocol) {
			const parentProtocol = parentProtocolsMap.get(protocol.parentProtocol)
			if (parentProtocol?.gecko_id) {
				geckoIds.add(`coingecko:${parentProtocol.gecko_id}`)
			}
		}
	}

	const protocolTokenPrices = geckoIds.size > 0 ? await fetchCoinPrices(Array.from(geckoIds)).catch(() => ({})) : {}

	const dimensionProtocols = {}

	for (const protocol of fees?.protocols ?? []) {
		if (protocol.total24h != null) {
			dimensionProtocols[protocol.defillamaId] = {
				...(dimensionProtocols[protocol.defillamaId] ?? {}),
				fees: {
					total24h: protocol.total24h ?? null,
					total7d: protocol.total7d ?? null,
					total30d: protocol.total30d ?? null,
					total1y: protocol.total1y ?? null,
					monthlyAverage1y: protocol.monthlyAverage1y ?? null,
					totalAllTime: protocol.totalAllTime ?? null
				}
			}
		}
	}

	for (const protocol of revenue?.protocols ?? []) {
		if (protocol.total24h != null) {
			dimensionProtocols[protocol.defillamaId] = {
				...(dimensionProtocols[protocol.defillamaId] ?? {}),
				revenue: {
					total24h: protocol.total24h ?? null,
					total7d: protocol.total7d ?? null,
					total30d: protocol.total30d ?? null,
					total1y: protocol.total1y ?? null,
					monthlyAverage1y: protocol.monthlyAverage1y ?? null,
					totalAllTime: protocol.totalAllTime ?? null
				}
			}
		}
	}

	for (const protocol of holdersRevenue?.protocols ?? []) {
		if (protocol.total24h != null) {
			dimensionProtocols[protocol.defillamaId] = {
				...(dimensionProtocols[protocol.defillamaId] ?? {}),
				holdersRevenue: {
					total24h: protocol.total24h ?? null,
					total7d: protocol.total7d ?? null,
					total30d: protocol.total30d ?? null,
					total1y: protocol.total1y ?? null,
					monthlyAverage1y: protocol.monthlyAverage1y ?? null,
					totalAllTime: protocol.totalAllTime ?? null
				}
			}
		}
	}

	for (const protocol of dexs?.protocols ?? []) {
		if (protocol.total24h != null) {
			dimensionProtocols[protocol.defillamaId] = {
				...(dimensionProtocols[protocol.defillamaId] ?? {}),
				dexs: {
					total24h: protocol.total24h ?? null,
					total7d: protocol.total7d ?? null,
					change_7dover7d: protocol.change_7dover7d ?? null,
					totalAllTime: protocol.totalAllTime ?? null
				}
			}
		}
	}
	const protocolsStore: Record<string, IProtocol> = {}

	const parentStore: Record<string, Array<IChildProtocol>> = {}

	for (const protocol of eligibleProtocols) {
		const tvls = {} as Record<TVL_TYPES, { tvl: number; tvlPrevDay: number; tvlPrevWeek: number; tvlPrevMonth: number }>

		if (chain === 'All') {
			tvls.default = {
				tvl: protocol.tvl ?? null,
				tvlPrevDay: protocol.tvlPrevDay ?? null,
				tvlPrevWeek: protocol.tvlPrevWeek ?? null,
				tvlPrevMonth: protocol.tvlPrevMonth ?? null
			}
		} else {
			tvls.default = {
				tvl: protocol?.chainTvls?.[currentChainMetadata.name]?.tvl ?? null,
				tvlPrevDay: protocol?.chainTvls?.[currentChainMetadata.name]?.tvlPrevDay ?? null,
				tvlPrevWeek: protocol?.chainTvls?.[currentChainMetadata.name]?.tvlPrevWeek ?? null,
				tvlPrevMonth: protocol?.chainTvls?.[currentChainMetadata.name]?.tvlPrevMonth ?? null
			}
		}

		const tvlChange = tvls.default.tvl
			? {
					change1d: getPercentChange(tvls.default.tvl, tvls.default.tvlPrevDay),
					change7d: getPercentChange(tvls.default.tvl, tvls.default.tvlPrevWeek),
					change1m: getPercentChange(tvls.default.tvl, tvls.default.tvlPrevMonth)
				}
			: null

		for (const chainKey in protocol.chainTvls ?? {}) {
			if (chain === 'All') {
				if (TVL_SETTINGS_KEYS_SET.has(chainKey as any) || chainKey === 'excludeParent') {
					tvls[chainKey] = {
						tvl: protocol?.chainTvls?.[chainKey]?.tvl ?? null,
						tvlPrevDay: protocol?.chainTvls?.[chainKey]?.tvlPrevDay ?? null,
						tvlPrevWeek: protocol?.chainTvls?.[chainKey]?.tvlPrevWeek ?? null,
						tvlPrevMonth: protocol?.chainTvls?.[chainKey]?.tvlPrevMonth ?? null
					}
				}
			} else {
				if (chainKey.startsWith(`${currentChainMetadata.name}-`)) {
					const tvlKey = chainKey.split('-')[1]
					tvls[tvlKey] = {
						tvl: protocol?.chainTvls?.[chainKey]?.tvl ?? null,
						tvlPrevDay: protocol?.chainTvls?.[chainKey]?.tvlPrevDay ?? null,
						tvlPrevWeek: protocol?.chainTvls?.[chainKey]?.tvlPrevWeek ?? null,
						tvlPrevMonth: protocol?.chainTvls?.[chainKey]?.tvlPrevMonth ?? null
					}
				}
			}
		}

		const childProtocolTvl = tvls?.default?.tvl
		const childMcapTvl =
			protocol.mcap != null && protocol.category !== 'Bridge' && childProtocolTvl != null && childProtocolTvl !== 0
				? +formatNum(+protocol.mcap.toFixed(2) / +childProtocolTvl.toFixed(2))
				: null

		const llamaswapChains = protocol.geckoId ? (protocolLlamaswapDataset?.[protocol.geckoId] ?? null) : null
		const childStore: IChildProtocol & { defillamaId: string } = {
			name: protocolMetadata[protocol.defillamaId].displayName,
			slug: slug(protocolMetadata[protocol.defillamaId].displayName),
			chains: protocolMetadata[protocol.defillamaId].chains,
			category: protocol.category ?? null,
			tvl: protocol.tvl != null && protocol.category !== 'Bridge' ? tvls : null,
			tvlChange: protocol.tvl != null && protocol.category !== 'Bridge' ? tvlChange : null,
			mcap: protocol.mcap ?? null,
			tokenPrice: protocol.geckoId ? (protocolTokenPrices[`coingecko:${protocol.geckoId}`]?.price ?? null) : null,
			...(llamaswapChains?.length ? { llamaswapChains } : {}),
			mcaptvl: childMcapTvl,
			strikeTvl:
				protocol.category !== 'Bridge'
					? toStrikeTvl(protocol, {
							liquidstaking: !!tvls?.liquidstaking,
							doublecounted: !!tvls?.doublecounted
						})
					: false,
			defillamaId: protocol.defillamaId
		}

		if (protocol.deprecated) {
			childStore.deprecated = true
		}

		if (dimensionProtocols[protocol.defillamaId]?.fees) {
			childStore.fees = dimensionProtocols[protocol.defillamaId].fees
			childStore.fees.pf = protocol.mcap
				? getAnnualizedRatio(protocol.mcap, dimensionProtocols[protocol.defillamaId].fees.total30d)
				: null
		}

		if (dimensionProtocols[protocol.defillamaId]?.revenue) {
			childStore.revenue = dimensionProtocols[protocol.defillamaId].revenue
			childStore.revenue.ps = protocol.mcap
				? getAnnualizedRatio(protocol.mcap, dimensionProtocols[protocol.defillamaId].revenue.total30d)
				: null
		}

		if (dimensionProtocols[protocol.defillamaId]?.holdersRevenue) {
			childStore.holdersRevenue = dimensionProtocols[protocol.defillamaId].holdersRevenue
		}

		if (dimensionProtocols[protocol.defillamaId]?.dexs) {
			childStore.dexs = dimensionProtocols[protocol.defillamaId].dexs
		}

		const emissionsMatch =
			emissionsProtocols[protocol.defillamaId] ||
			emissionsProtocols[protocolMetadata[protocol.defillamaId]?.displayName]

		if (emissionsMatch) {
			childStore.emissions = {
				total24h: emissionsMatch.emissions24h,
				total7d: emissionsMatch.emissions7d,
				total30d: emissionsMatch.emissions30d,
				total1y: emissionsMatch.emissions1y,
				monthlyAverage1y: emissionsMatch.emissionsMonthlyAverage1y,
				totalAllTime: emissionsMatch.emissionsAllTime
			}
		}

		if (protocol.parentProtocol && protocolMetadata[protocol.parentProtocol]) {
			parentStore[protocol.parentProtocol] = [...(parentStore?.[protocol.parentProtocol] ?? []), childStore]
		} else {
			protocolsStore[protocol.defillamaId] = childStore
		}
	}

	// Keep protocols ungrouped when filtering leaves only one child under a parent.
	for (const parentId in parentStore) {
		if (parentStore[parentId].length !== 1) continue
		const onlyChild = parentStore[parentId][0] as IChildProtocol & { defillamaId?: string }
		if (onlyChild.defillamaId) {
			protocolsStore[onlyChild.defillamaId] = onlyChild
		}
	}

	for (const parentProtocol of parentProtocols) {
		if (parentStore[parentProtocol.id] && parentStore[parentProtocol.id].length > 1) {
			const parentTvl = parentStore[parentProtocol.id].some((child) => child.tvl !== null)
				? parentStore[parentProtocol.id].reduce(
						(acc, curr) => {
							for (const chainOrExtraTvlKey in curr.tvl ?? {}) {
								if (!acc[chainOrExtraTvlKey]) {
									acc[chainOrExtraTvlKey] = {}
								}
								for (const currentOrPreviousTvlKey in curr.tvl[chainOrExtraTvlKey]) {
									let currValue = curr.tvl[chainOrExtraTvlKey][currentOrPreviousTvlKey]

									// Skip if accumulator is already null (don't override)
									if (acc[chainOrExtraTvlKey][currentOrPreviousTvlKey] === null) {
										continue
									}

									if (currValue == null) {
										// If current value is null, propagate null to parent only for these keys
										if (['tvlPrevDay', 'tvlPrevWeek', 'tvlPrevMonth'].includes(currentOrPreviousTvlKey)) {
											acc[chainOrExtraTvlKey][currentOrPreviousTvlKey] = null
										}
									} else {
										acc[chainOrExtraTvlKey][currentOrPreviousTvlKey] =
											(acc[chainOrExtraTvlKey][currentOrPreviousTvlKey] ?? 0) + currValue
									}
								}
							}
							return acc
						},
						{} as IChildProtocol['tvl']
					)
				: null

			const parentFees = parentStore[parentProtocol.id].some((child) => child.fees !== null)
				? parentStore[parentProtocol.id].reduce(
						(acc, curr) => {
							for (const key1 in curr.fees ?? {}) {
								acc[key1] = (acc[key1] ?? 0) + curr.fees[key1]
							}
							return acc
						},
						{} as IChildProtocol['fees']
					)
				: null

			if (parentFees) {
				parentFees.pf = getAnnualizedRatio(parentProtocol.mcap, parentFees.total30d)
			}

			const parentRevenue = parentStore[parentProtocol.id].some((child) => child.revenue !== null)
				? parentStore[parentProtocol.id].reduce(
						(acc, curr) => {
							for (const key1 in curr.revenue ?? {}) {
								acc[key1] = (acc[key1] ?? 0) + curr.revenue[key1]
							}
							return acc
						},
						{} as IChildProtocol['revenue']
					)
				: null

			if (parentRevenue) {
				parentRevenue.ps = getAnnualizedRatio(parentProtocol.mcap, parentRevenue.total30d)
			}

			const parentHoldersRevenue = parentStore[parentProtocol.id].some((child) => child.holdersRevenue !== null)
				? parentStore[parentProtocol.id].reduce(
						(acc, curr) => {
							for (const key1 in curr.holdersRevenue ?? {}) {
								acc[key1] = (acc[key1] ?? 0) + curr.holdersRevenue[key1]
							}
							return acc
						},
						{} as IChildProtocol['holdersRevenue']
					)
				: null

			const parentDexs = parentStore[parentProtocol.id].some((child) => child.dexs !== null)
				? parentStore[parentProtocol.id].reduce(
						(acc, curr) => {
							for (const key1 in curr.dexs ?? {}) {
								acc[key1] = (acc[key1] ?? 0) + curr.dexs[key1]
							}
							return acc
						},
						{} as IChildProtocol['dexs']
					)
				: null

			let parentEmissions = parentStore[parentProtocol.id].some((child) => child.emissions !== null)
				? parentStore[parentProtocol.id].reduce(
						(acc, curr) => {
							for (const key1 in curr.emissions ?? {}) {
								acc[key1] = (acc[key1] ?? 0) + curr.emissions[key1]
							}
							return acc
						},
						{} as IChildProtocol['emissions']
					)
				: null

			if (!parentEmissions) {
				const parentEmissionsMatch = emissionsProtocols[protocolMetadata[parentProtocol.id]?.displayName]
				if (parentEmissionsMatch) {
					parentEmissions = {
						total24h: parentEmissionsMatch.emissions24h,
						total7d: parentEmissionsMatch.emissions7d,
						total30d: parentEmissionsMatch.emissions30d,
						total1y: parentEmissionsMatch.emissions1y,
						monthlyAverage1y: parentEmissionsMatch.emissionsMonthlyAverage1y,
						totalAllTime: parentEmissionsMatch.emissionsAllTime
					}
				}
			}

			if (parentTvl?.excludeParent) {
				parentTvl.default.tvl = (parentTvl.default.tvl ?? 0) - (parentTvl.excludeParent.tvl ?? 0)
				// Only subtract excludeParent from prev values if they're not null
				// (null means incomplete data, so we shouldn't compute a change)
				if (parentTvl.default.tvlPrevDay != null) {
					parentTvl.default.tvlPrevDay = parentTvl.default.tvlPrevDay - (parentTvl.excludeParent.tvlPrevDay ?? 0)
				}
				if (parentTvl.default.tvlPrevWeek != null) {
					parentTvl.default.tvlPrevWeek = parentTvl.default.tvlPrevWeek - (parentTvl.excludeParent.tvlPrevWeek ?? 0)
				}
				if (parentTvl.default.tvlPrevMonth != null) {
					parentTvl.default.tvlPrevMonth = parentTvl.default.tvlPrevMonth - (parentTvl.excludeParent.tvlPrevMonth ?? 0)
				}
			}

			const prevKeys = ['tvlPrevDay', 'tvlPrevWeek', 'tvlPrevMonth'] as const
			const missingPrevKeys = prevKeys.filter((key) =>
				parentStore[parentProtocol.id].some(
					(child) => child.tvl?.default?.['tvl'] != null && child.tvl?.default?.[key] == null
				)
			)

			if (missingPrevKeys.length && parentTvl?.default) {
				for (const key of missingPrevKeys) {
					parentTvl.default[key] = null
				}
			}

			const parentTvlChange =
				parentTvl?.default?.tvl != null
					? {
							change1d: getPercentChange(parentTvl.default.tvl, parentTvl.default.tvlPrevDay),
							change7d: getPercentChange(parentTvl.default.tvl, parentTvl.default.tvlPrevWeek),
							change1m: getPercentChange(parentTvl.default.tvl, parentTvl.default.tvlPrevMonth)
						}
					: null

			const categorySet = new Set<string>()
			for (const p of parentStore[parentProtocol.id]) {
				if (p.category) categorySet.add(p.category)
			}
			const chilsProtocolCategories = Array.from(categorySet)

			const parentProtocolTvl = parentTvl?.default?.tvl
			const parentMcapTvl =
				parentProtocol.mcap != null && parentProtocolTvl != null && parentProtocolTvl !== 0
					? +formatNum(+parentProtocol.mcap.toFixed(2) / +parentProtocolTvl.toFixed(2))
					: null

			const parentLlamaswapChains = parentProtocol.gecko_id
				? (protocolLlamaswapDataset?.[parentProtocol.gecko_id] ?? null)
				: null

			protocolsStore[parentProtocol.id] = {
				name: protocolMetadata[parentProtocol.id].displayName,
				slug: slug(protocolMetadata[parentProtocol.id].displayName),
				category: chilsProtocolCategories.length > 1 ? null : chilsProtocolCategories[0],
				childProtocols: parentStore[parentProtocol.id],
				chains: Array.from(new Set(parentStore[parentProtocol.id].flatMap((p) => p.chains ?? []))),
				tvl: parentTvl,
				tvlChange: parentTvlChange,
				strikeTvl: parentStore[parentProtocol.id].some((child) => child.strikeTvl),
				mcap: parentProtocol.mcap ?? null,
				tokenPrice: parentProtocol.gecko_id
					? (protocolTokenPrices[`coingecko:${parentProtocol.gecko_id}`]?.price ?? null)
					: null,
				...(parentLlamaswapChains?.length ? { llamaswapChains: parentLlamaswapChains } : {}),
				mcaptvl: parentMcapTvl
			}

			if (parentFees) {
				protocolsStore[parentProtocol.id].fees = parentFees
			}
			if (parentRevenue) {
				protocolsStore[parentProtocol.id].revenue = parentRevenue
			}
			if (parentDexs) {
				protocolsStore[parentProtocol.id].dexs = parentDexs
			}
			if (parentHoldersRevenue) {
				protocolsStore[parentProtocol.id].holdersRevenue = parentHoldersRevenue
			}
			if (parentEmissions) {
				protocolsStore[parentProtocol.id].emissions = parentEmissions
			}
		}
	}

	const finalProtocols: IProtocol[] = []

	for (const protocol in protocolsStore) {
		finalProtocols.push(protocolsStore[protocol])
	}

	return {
		protocols: finalProtocols.sort((a, b) => (b.tvl?.default?.tvl ?? 0) - (a.tvl?.default?.tvl ?? 0)),
		chains,
		fees,
		dexs,
		emissionsData: emissionsProtocols
	}
}
