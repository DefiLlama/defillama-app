import { useMemo } from 'react'
import { IChain, IFormattedProtocol, IParentProtocol } from '~/api/types'
import { useDefiChainsManager, useDefiManager } from '~/contexts/LocalStorage'
import { getPercentChange } from '~/utils'
import { formatDataWithExtraTvls, groupDataWithTvlsByDay } from './defi'
import { groupProtocols } from './utils'

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

	return protocolTotals
}

// used in tables of protocols by chain and categories pages
export const useCalcProtocolsTvls = ({
	protocols,
	parentProtocols
}: {
	protocols: IFormattedProtocol[]
	parentProtocols: IParentProtocol[]
}) => {
	const [extraTvlsEnabled] = useDefiManager()

	const protocolTotals = useMemo(() => {
		const checkExtras = {
			...extraTvlsEnabled,
			doublecounted: !extraTvlsEnabled.doublecounted
		}

		const updatedProtocols = Object.values(checkExtras).every((t) => !t)
			? protocols
			: protocols.map(({ tvl, tvlPrevDay, tvlPrevWeek, tvlPrevMonth, extraTvl, mcap, ...props }) => {
					let finalTvl: number | null = tvl
					let finalTvlPrevDay: number | null = tvlPrevDay
					let finalTvlPrevWeek: number | null = tvlPrevWeek
					let finalTvlPrevMonth: number | null = tvlPrevMonth
					let strikeTvl = false

					// keep liquid staking in same positon in table but strike its tvl
					if (props.category === 'Liquid Staking' && !extraTvlsEnabled['liquidstaking']) {
						strikeTvl = true
					}

					Object.entries(extraTvl).forEach(([prop, propValues]) => {
						const { tvl, tvlPrevDay, tvlPrevWeek, tvlPrevMonth } = propValues

						if (prop === 'doublecounted' && !extraTvlsEnabled['doublecounted']) {
							strikeTvl = true
						} else {
							// convert to lowercase as server response is not consistent in extra-tvl names
							if (
								extraTvlsEnabled[prop.toLowerCase()] &&
								prop.toLowerCase() !== 'doublecounted' &&
								prop.toLowerCase() !== 'liquidstaking'
							) {
								// check if final tvls are null, if they are null and tvl exist on selected option, convert to 0 and add them
								tvl && (finalTvl = (finalTvl || 0) + tvl)
								tvlPrevDay && (finalTvlPrevDay = (finalTvlPrevDay || 0) + tvlPrevDay)
								tvlPrevWeek && (finalTvlPrevWeek = (finalTvlPrevWeek || 0) + tvlPrevWeek)
								tvlPrevMonth && (finalTvlPrevMonth = (finalTvlPrevMonth || 0) + tvlPrevMonth)
							}
						}
					})

					let change1d: number | null = getPercentChange(finalTvl, finalTvlPrevDay)
					let change7d: number | null = getPercentChange(finalTvl, finalTvlPrevWeek)
					let change1m: number | null = getPercentChange(finalTvl, finalTvlPrevMonth)

					const mcaptvl = mcap && finalTvl ? mcap / finalTvl : null

					return {
						...props,
						tvl: finalTvl,
						tvlPrevDay: finalTvlPrevDay,
						tvlPrevWeek: finalTvlPrevWeek,
						tvlPrevMonth: finalTvlPrevMonth,
						change_1d: change1d,
						change_7d: change7d,
						change_1m: change1m,
						mcap,
						mcaptvl,
						strikeTvl
					}
			  })

		return parentProtocols ? groupProtocols(updatedProtocols, parentProtocols) : updatedProtocols
	}, [protocols, extraTvlsEnabled, parentProtocols])

	return protocolTotals
}

export const useCalcSingleExtraTvl = (chainTvls, simpleTvl): number => {
	const [extraTvlsEnabled] = useDefiManager()

	const protocolTvl = useMemo(() => {
		let tvl = simpleTvl
		Object.entries(chainTvls).forEach(([section, sectionTvl]: any) => {
			if (section === 'doublecounted') {
				tvl -= sectionTvl
			}
			// convert to lowercase as server response is not consistent in extra-tvl names
			if (extraTvlsEnabled[section.toLowerCase()]) tvl += sectionTvl
		})
		return tvl
	}, [extraTvlsEnabled, simpleTvl, chainTvls])

	return protocolTvl
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

						if (childData && alreadyAdded === undefined) {
							tvl += childData.tvl
							tvlPrevDay += childData.tvlPrevDay
							tvlPrevWeek += childData.tvlPrevWeek
							tvlPrevMonth += childData.tvlPrevMonth
							mcap += childData.mcap
							stablesMcap += childData.stablesMcap
							protocols += childData.protocols
							const subChains = finalData[parentName].subRows || []
							let mcaptvl = mcap && tvl && mcap / tvl

							finalData[parentName] = {
								...finalData[parentName],
								tvl,
								tvlPrevDay,
								tvlPrevWeek,
								tvlPrevMonth,
								mcap,
								stablesMcap,
								mcaptvl,
								protocols,
								name: parentName,
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

	return groupDataWithTvlsByDay({ chains, tvlTypes, extraTvlsEnabled: extraTvls })
}

// returns tvl by day for a single token
export const useCalcExtraTvlsByDay = (data) => {
	const [extraTvlsEnabled] = useDefiManager()

	return useMemo(() => {
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

			return [date, sum]
		})
	}, [data, extraTvlsEnabled])
}
