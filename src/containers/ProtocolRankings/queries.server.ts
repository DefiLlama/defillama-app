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
import { formatNum, getMarketCapToAnnualizedMetricRatio, getPercentChange, slug } from '~/utils'
import type { IChainMetadata, IProtocolMetadata, ProtocolLlamaswapMetadata } from '~/utils/metadata/types'
import { buildDimensionProtocolMetrics } from './readModel'
import type { IChildProtocol, IProtocol, TVL_TYPES } from './types'
import { protocolMatchesForkFilter, protocolMatchesOracleFilter, toFilterProtocol, toStrikeTvl } from './utils'

const PREVIOUS_TVL_KEYS = ['tvlPrevDay', 'tvlPrevWeek', 'tvlPrevMonth'] as const
const PREVIOUS_TVL_KEYS_SET = new Set<string>(PREVIOUS_TVL_KEYS)
const STRICT_NULL_METRIC_KEYS = new Set<string>(['annualized1y'])

function addMetricTotals<T extends object>(acc: T, values: T | null | undefined) {
	for (const key in values ?? {}) {
		if (key === 'change_7dover7d') continue

		const metricKey = key as keyof T
		const value = values?.[metricKey] as number | null | undefined
		if (value == null) {
			if (STRICT_NULL_METRIC_KEYS.has(key) || acc[metricKey] === undefined) {
				acc[metricKey] = null as T[keyof T]
			}
			continue
		}
		const numericValue = Number(value)
		if (!Number.isFinite(numericValue)) continue
		if (STRICT_NULL_METRIC_KEYS.has(key) && acc[metricKey] === null) {
			continue
		}
		acc[metricKey] = (((acc[metricKey] as number | null | undefined) ?? 0) + numericValue) as T[keyof T]
	}
}

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
			protocolMatchesForkFilter({ protocol, normalizedFork }) &&
			protocolMatchesOracleFilter({
				protocol,
				normalizedOracle,
				isAllChains: chain === 'All',
				chainDisplayName: currentChainMetadata.name
			}) &&
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

	const dimensionProtocols = buildDimensionProtocolMetrics({ fees, revenue, holdersRevenue, dexs })
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

		const tvlChange =
			tvls.default.tvl != null
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
		let childMcapTvl: number | null = null
		if (protocol.mcap != null && protocol.category !== 'Bridge' && childProtocolTvl != null && childProtocolTvl !== 0) {
			// Derived display math can be non-finite even when upstream fields are numeric.
			const childMcapTvlRatio = +protocol.mcap.toFixed(2) / +childProtocolTvl.toFixed(2)
			childMcapTvl = Number.isFinite(childMcapTvlRatio) ? +formatNum(childMcapTvlRatio) : null
		}

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

		const dimensionProtocol = dimensionProtocols[protocol.defillamaId]
		const feesMetrics = dimensionProtocol?.fees
		if (feesMetrics) {
			childStore.fees = {
				total24h: feesMetrics.total24h,
				total7d: feesMetrics.total7d,
				total30d: feesMetrics.total30d,
				total1y: feesMetrics.total1y,
				annualized1y: feesMetrics.annualized1y,
				monthlyAverage1y: feesMetrics.monthlyAverage1y,
				totalAllTime: feesMetrics.totalAllTime,
				pf: protocol.mcap != null ? getMarketCapToAnnualizedMetricRatio(protocol.mcap, feesMetrics.annualized1y) : null
			}
		}

		const revenueMetrics = dimensionProtocol?.revenue
		if (revenueMetrics) {
			childStore.revenue = {
				total24h: revenueMetrics.total24h,
				total7d: revenueMetrics.total7d,
				total30d: revenueMetrics.total30d,
				total1y: revenueMetrics.total1y,
				annualized1y: revenueMetrics.annualized1y,
				monthlyAverage1y: revenueMetrics.monthlyAverage1y,
				totalAllTime: revenueMetrics.totalAllTime,
				ps:
					protocol.mcap != null ? getMarketCapToAnnualizedMetricRatio(protocol.mcap, revenueMetrics.annualized1y) : null
			}
		}

		if (dimensionProtocol?.holdersRevenue) {
			childStore.holdersRevenue = dimensionProtocol.holdersRevenue
		}

		if (dimensionProtocol?.dexs) {
			childStore.dexs = dimensionProtocol.dexs
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
			parentStore[protocol.parentProtocol] ??= []
			parentStore[protocol.parentProtocol].push(childStore)
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
		const childProtocols = parentStore[parentProtocol.id]
		if (childProtocols && childProtocols.length > 1) {
			let parentTvl: IChildProtocol['tvl'] | null = null
			let parentFees: IChildProtocol['fees'] | null = null
			let parentRevenue: IChildProtocol['revenue'] | null = null
			let parentHoldersRevenue: IChildProtocol['holdersRevenue'] | null = null
			let parentDexs: IChildProtocol['dexs'] | null = null
			let parentEmissions: IChildProtocol['emissions'] | null = null
			let parentDexsPrevious7d = 0
			let hasParentDexsChangeInput = false
			let isParentDexsChangeIncomplete = false
			const missingPrevKeys = new Set<(typeof PREVIOUS_TVL_KEYS)[number]>()
			const categorySet = new Set<string>()
			const chainsSet = new Set<string>()
			let parentStrikeTvl = false

			for (const child of childProtocols) {
				if (child.tvl !== null) {
					parentTvl ??= {} as IChildProtocol['tvl']
					for (const chainOrExtraTvlKey in child.tvl ?? {}) {
						if (!parentTvl[chainOrExtraTvlKey]) {
							parentTvl[chainOrExtraTvlKey] = {}
						}
						for (const currentOrPreviousTvlKey in child.tvl[chainOrExtraTvlKey]) {
							if (
								child.deprecated &&
								child.tvl[chainOrExtraTvlKey].tvl === 0 &&
								PREVIOUS_TVL_KEYS_SET.has(currentOrPreviousTvlKey)
							) {
								continue
							}

							const currValue = child.tvl[chainOrExtraTvlKey][currentOrPreviousTvlKey]

							// Skip if accumulator is already null (don't override)
							if (parentTvl[chainOrExtraTvlKey][currentOrPreviousTvlKey] === null) {
								continue
							}

							if (currValue == null) {
								// If current value is null, propagate null to parent only for these keys
								if (PREVIOUS_TVL_KEYS_SET.has(currentOrPreviousTvlKey)) {
									parentTvl[chainOrExtraTvlKey][currentOrPreviousTvlKey] = null
								}
							} else {
								parentTvl[chainOrExtraTvlKey][currentOrPreviousTvlKey] =
									(parentTvl[chainOrExtraTvlKey][currentOrPreviousTvlKey] ?? 0) + currValue
							}
						}
					}
				}

				if (child.tvl?.default?.tvl != null && !(child.deprecated && child.tvl.default.tvl === 0)) {
					for (const key of PREVIOUS_TVL_KEYS) {
						if (child.tvl.default[key] == null) {
							missingPrevKeys.add(key)
						}
					}
				}

				if (child.fees != null) {
					parentFees ??= {} as NonNullable<IChildProtocol['fees']>
					addMetricTotals(parentFees, child.fees)
				}
				if (child.revenue != null) {
					parentRevenue ??= {} as NonNullable<IChildProtocol['revenue']>
					addMetricTotals(parentRevenue, child.revenue)
				}
				if (child.holdersRevenue != null) {
					parentHoldersRevenue ??= {} as NonNullable<IChildProtocol['holdersRevenue']>
					addMetricTotals(parentHoldersRevenue, child.holdersRevenue)
				}
				if (child.dexs != null) {
					parentDexs ??= {} as NonNullable<IChildProtocol['dexs']>
					addMetricTotals(parentDexs, child.dexs)

					if (child.dexs.total7d != null) {
						const change = child.dexs.change_7dover7d
						const previous7dRatio = change == null ? null : 1 + change / 100
						if (previous7dRatio == null || previous7dRatio <= 0) {
							isParentDexsChangeIncomplete = true
						} else {
							hasParentDexsChangeInput = true
							parentDexsPrevious7d += child.dexs.total7d / previous7dRatio
						}
					}
				}
				if (child.emissions != null) {
					parentEmissions ??= {} as NonNullable<IChildProtocol['emissions']>
					addMetricTotals(parentEmissions, child.emissions)
				}

				if (child.category) categorySet.add(child.category)
				for (const childChain of child.chains ?? []) {
					chainsSet.add(childChain)
				}
				if (child.strikeTvl) parentStrikeTvl = true
			}

			if (parentFees) {
				parentFees.pf = getMarketCapToAnnualizedMetricRatio(parentProtocol.mcap, parentFees.annualized1y)
			}

			if (parentRevenue) {
				parentRevenue.ps = getMarketCapToAnnualizedMetricRatio(parentProtocol.mcap, parentRevenue.annualized1y)
			}

			if (parentDexs) {
				parentDexs.change_7dover7d =
					isParentDexsChangeIncomplete || !hasParentDexsChangeInput
						? null
						: getPercentChange(parentDexs.total7d, parentDexsPrevious7d)
			}

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

			if (missingPrevKeys.size && parentTvl?.default) {
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
				childProtocols,
				chains: Array.from(chainsSet),
				tvl: parentTvl,
				tvlChange: parentTvlChange,
				strikeTvl: parentStrikeTvl,
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
