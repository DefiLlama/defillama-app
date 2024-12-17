import { useMemo } from 'react'
import { IChain, IFormattedProtocol } from '~/api/types'
import { useDefiChainsManager, useDefiManager } from '~/contexts/LocalStorage'
import { formatDataWithExtraTvls, groupDataWithTvlsByDay } from './defi'
import { getPercentChange } from '~/utils'

type DataValue = number | null

interface GroupChain extends IChain {
	subChains: IChain[]
}

// PROTOCOLS
export const useCalcStakePool2Tvl = (
	filteredProtocols: Readonly<Array<IFormattedProtocol>>,
	defaultSortingColumn?: string,
	dir?: 'asc',
	applyLqAndDc = false
) => {
	const [extraTvlsEnabled] = useDefiManager()

	const protocolTotals = useMemo(() => {
		return formatDataWithExtraTvls({
			data: filteredProtocols,
			defaultSortingColumn,
			dir,
			applyLqAndDc,
			extraTvlsEnabled
		})
	}, [filteredProtocols, extraTvlsEnabled, defaultSortingColumn, dir, applyLqAndDc])

	return protocolTotals as unknown as Array<IFormattedProtocol>
}

export const useGroupChainsByParent = (chains, groupData): GroupChain[] => {
	const [groupsEnabled] = useDefiChainsManager()

	const data: GroupChain[] = useMemo(() => {
		const finalData = {}
		const addedChains = []
		for (const parentName in groupData) {
			let tvl: DataValue = null
			let tvlPrevDay: DataValue = null
			let tvlPrevWeek: DataValue = null
			let tvlPrevMonth: DataValue = null
			let mcap: DataValue = null
			let stablesMcap: DataValue = null
			let protocols: DataValue = null
			let users: DataValue = null
			let totalVolume24h: DataValue = null
			let totalFees24h: DataValue = null
			let totalRevenue24h: DataValue = null
			let totalAssets: DataValue = null
			let chainAssets: {
				total?: number | null
				canonical?: number | null
				ownTokens?: number | null
				native?: number | null
				thirdParty?: number | null
			} = {}
			let nftVolume: DataValue = null

			finalData[parentName] = {}

			const parentData = chains.find((item) => item.name === parentName)
			if (parentData) {
				tvl = parentData.tvl || null
				tvlPrevDay = parentData.tvlPrevDay || null
				tvlPrevWeek = parentData.tvlPrevWeek || null
				tvlPrevMonth = parentData.tvlPrevMonth || null
				mcap = parentData.mcap || null
				stablesMcap = parentData.stablesMcap || null
				protocols = parentData.protocols || null
				users = parentData.users || null
				totalVolume24h = parentData.totalVolume24h || null
				totalFees24h = parentData.totalFees24h || null
				totalRevenue24h = parentData.totalRevenue24h || null
				totalAssets = parentData.totalAssets || null
				chainAssets = { ...(parentData.chainAssets ?? {}) }
				nftVolume = parentData.nftVolume || null
				finalData[parentName] = {
					...parentData,
					subRows: [parentData],
					symbol: '-'
				}

				addedChains.push(parentName)
			} else {
				finalData[parentName] = {
					symbol: '-'
				}
			}

			let addedChildren = false
			for (const type in groupData[parentName]) {
				if (groupsEnabled[type] === true) {
					for (const child of groupData[parentName][type]) {
						const childData = chains.find((item) => item.name === child)

						const alreadyAdded = (finalData[parentName].subRows ?? []).find((p) => p.name === child)

						if (childData && !alreadyAdded) {
							tvl += childData.tvl
							tvlPrevDay += childData.tvlPrevDay
							tvlPrevWeek += childData.tvlPrevWeek
							tvlPrevMonth += childData.tvlPrevMonth
							mcap += childData.mcap
							stablesMcap += childData.stablesMcap
							protocols += childData.protocols
							users += childData.users || null
							totalVolume24h += childData.totalVolume24h || null
							totalFees24h += childData.totalFees24h || null
							totalRevenue24h += childData.totalRevenue24h || null
							totalAssets += childData.totalAssets || null

							if (childData.chainAssets) {
								chainAssets.total = +(chainAssets.total ?? 0) + +(childData.chainAssets.total ?? 0)
								chainAssets.ownTokens = +(chainAssets.ownTokens ?? 0) + +(childData.chainAssets.ownTokens ?? 0)
								chainAssets.canonical = +(chainAssets.canonical ?? 0) + +(childData.chainAssets.canonical ?? 0)
								chainAssets.native = +(chainAssets.native ?? 0) + +(childData.chainAssets.native ?? 0)
								chainAssets.thirdParty = +(chainAssets.thirdParty ?? 0) + +(childData.chainAssets.thirdParty ?? 0)
							}

							nftVolume += childData.nftVolume || null
							const subChains = finalData[parentName].subRows || []
							let mcaptvl = mcap && tvl ? +(mcap / tvl).toFixed(2) : null
							let change_1d = getPercentChange(tvl, tvlPrevDay)
							let change_7d = getPercentChange(tvl, tvlPrevWeek)
							let change_1m = getPercentChange(tvl, tvlPrevMonth)

							finalData[parentName] = {
								...finalData[parentName],
								tvl,
								tvlPrevDay,
								tvlPrevWeek,
								tvlPrevMonth,
								mcap,
								stablesMcap,
								mcaptvl: mcaptvl ?? undefined,
								protocols,
								users,
								totalVolume24h,
								totalFees24h,
								totalRevenue24h,
								totalAssets,
								chainAssets,
								nftVolume,
								name: parentName,
								change_1d,
								change_7d,
								change_1m,
								subRows: [...subChains, childData]
							}
							addedChains.push(child)
							addedChildren = true
						}
					}
				}
			}
			if (!addedChildren) {
				if (finalData[parentName].tvl === undefined) {
					delete finalData[parentName]
				} else {
					finalData[parentName] = parentData
				}
			}
		}

		chains.forEach((item) => {
			if (!addedChains.includes(item.name)) {
				finalData[item.name] = item
			}
		})
		return (Object.values(finalData) as GroupChain[]).sort((a, b) => b.tvl - a.tvl)
	}, [chains, groupData, groupsEnabled])

	return data
}

// returns tvl by day for a group of tokens
export const useCalcGroupExtraTvlsByDay = (chains, tvlTypes = null) => {
	const [extraTvls] = useDefiManager()

	return useMemo(
		() => groupDataWithTvlsByDay({ chains, tvlTypes, extraTvlsEnabled: extraTvls }),
		[extraTvls, chains, tvlTypes]
	)
}

// returns tvl by day for a single token
export function formatChartTvlsByDay({ data, extraTvlsEnabled, key }) {
	return data.map(([date, values]) => {
		let sum = values.tvl || 0

		for (const value in values) {
			if (value === 'doublecounted' && !extraTvlsEnabled['doublecounted']) {
				sum -= values[value]
			}

			if ((value === 'liquidstaking' || value === 'd') && !extraTvlsEnabled['liquidstaking']) {
				sum -= values[value]
			}

			if (value.toLowerCase() === 'dcandlsoverlap') {
				if (!extraTvlsEnabled['doublecounted'] || !extraTvlsEnabled['liquidstaking']) {
					sum += values[value]
				}
			}

			if (extraTvlsEnabled[value.toLowerCase()] && value !== 'doublecounted' && value !== 'liquidstaking') {
				sum += values[value]
			}
		}

		return { date, [key]: sum }
	})
}
