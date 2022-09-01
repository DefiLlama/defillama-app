import { useMemo } from 'react'
import { IFormattedProtocol, IParentProtocol } from '~/api/types'
import { useDefiChainsManager, useDefiManager, useStablecoinsManager } from '~/contexts/LocalStorage'
import { capitalizeFirstLetter, getPercentChange } from '~/utils'
import { groupProtocols } from './utils'

// TODO cleanup
interface IProtocol {
	name: string
	protocols: number
	tvl: number | null
	tvlPrevDay: number | null
	tvlPrevWeek: number | null
	tvlPrevMonth: number | null
	mcap: number | null
	mcaptvl: number | null
	category: string
	symbol: string
	extraTvl?: {
		[key: string]: {
			tvl: number | null
			tvlPrevDay: number | null
			tvlPrevWeek: number | null
			tvlPrevMonth: number | null
		}
	}
	chains?: string[]
}

interface IChainTvl {
	[key: string]: number
}

type ChainTvlsByDay = [string, IChainTvl]

type DataValue = number | null

interface IGroupData {
	[key: string]: {}
}

interface IChain {
	tvl: number
	tvlPrevDay: number
	tvlPrevWeek: number
	tvlPrevMonth: number
	mcap: number
	name: string
	protocols: number
	mcaptvl: number
}

interface GroupChain extends IChain {
	subChains: IChain[]
}

interface IPegged {
	circulating: number
	minted: number
	bridgedTo: number
	unreleased: number
	mcap: number
	mcaptvl: number
	name: string
	symbol: string
	gecko_id: string
	price: number
	pegType: string
	change_1d: number | null
	change_7d: number | null
	change_1m: number | null
	circulatingPrevDay: number
	circulatingPrevWeek: number
	circulatingPrevMonth: number
	bridges: {
		[bridgeID: string]: {
			[source: string]: {
				amount: number
			}
		}
	}
	dominance: {
		name: string
		value: number
	}
	bridgedAmount: number
	pegDeviation: number
	getDeviation_1m: number
	pegDeviationInfo: {
		timestamp: number
		price: number
		priceSource: string
	}
}

interface GroupChainPegged extends IPegged {
	subChains: IPegged[]
}

type Bridge = {
	name: string
	link?: string
}

type BridgeInfo = {
	[bridgeID: string]: Bridge
}

// PROTOCOLS
export const useCalcStakePool2Tvl = (
	filteredProtocols: Readonly<IProtocol[]>,
	defaultSortingColumn?: string,
	dir?: 'asc',
	applyLqAndDc = false
) => {
	const [extraTvlsEnabled] = useDefiManager()

	const protocolTotals = useMemo(() => {
		const updatedProtocols = filteredProtocols.map(
			({ tvl, tvlPrevDay, tvlPrevWeek, tvlPrevMonth, extraTvl, mcap, ...props }) => {
				let finalTvl: number | null = tvl
				let finalTvlPrevDay: number | null = tvlPrevDay
				let finalTvlPrevWeek: number | null = tvlPrevWeek
				let finalTvlPrevMonth: number | null = tvlPrevMonth

				// if (props.name === 'Ethereum') {
				// 	const initialTvl = tvl
				// 	const doublecounted = extraTvl['doublecounted'].tvl
				// 	const liquidstaking = extraTvl['liquidstaking'].tvl
				// 	const overlap = extraTvl['dcandlsoverlap'].tvl
				// 	console.log(['doublecounted', 'liquidstaking', 'total'])
				// 	console.log(['on', 'on', initialTvl])
				// 	console.log(['on', 'off', initialTvl - liquidstaking + overlap])
				// 	console.log(['off', 'on', initialTvl - doublecounted + overlap])
				// 	console.log(['off', 'off', initialTvl - doublecounted - liquidstaking + overlap])
				// }

				Object.entries(extraTvl).forEach(([prop, propValues]) => {
					const { tvl, tvlPrevDay, tvlPrevWeek, tvlPrevMonth } = propValues

					if (applyLqAndDc && prop === 'doublecounted' && !extraTvlsEnabled['doublecounted']) {
						tvl && (finalTvl = (finalTvl || 0) - tvl)
						tvlPrevDay && (finalTvlPrevDay = (finalTvlPrevDay || 0) - tvlPrevDay)
						tvlPrevWeek && (finalTvlPrevWeek = (finalTvlPrevWeek || 0) - tvlPrevWeek)
						tvlPrevMonth && (finalTvlPrevMonth = (finalTvlPrevMonth || 0) - tvlPrevMonth)
					}

					if (applyLqAndDc && prop === 'liquidstaking' && !extraTvlsEnabled['liquidstaking']) {
						tvl && (finalTvl = (finalTvl || 0) - tvl)
						tvlPrevDay && (finalTvlPrevDay = (finalTvlPrevDay || 0) - tvlPrevDay)
						tvlPrevWeek && (finalTvlPrevWeek = (finalTvlPrevWeek || 0) - tvlPrevWeek)
						tvlPrevMonth && (finalTvlPrevMonth = (finalTvlPrevMonth || 0) - tvlPrevMonth)
					}

					if (applyLqAndDc && prop.toLowerCase() === 'dcandlsoverlap') {
						if (!extraTvlsEnabled['doublecounted'] || !extraTvlsEnabled['liquidstaking']) {
							tvl && (finalTvl = (finalTvl || 0) + tvl)
							tvlPrevDay && (finalTvlPrevDay = (finalTvlPrevDay || 0) + tvlPrevDay)
							tvlPrevWeek && (finalTvlPrevWeek = (finalTvlPrevWeek || 0) + tvlPrevWeek)
							tvlPrevMonth && (finalTvlPrevMonth = (finalTvlPrevMonth || 0) + tvlPrevMonth)
						}
					}

					// convert to lowercase as server response is not consistent in extra-tvl names
					if (extraTvlsEnabled[prop.toLowerCase()] && prop !== 'doublecounted' && prop !== 'liquidstaking') {
						// check if final tvls are null, if they are null and tvl exist on selected option, convert to 0 and add them
						tvl && (finalTvl = (finalTvl || 0) + tvl)
						tvlPrevDay && (finalTvlPrevDay = (finalTvlPrevDay || 0) + tvlPrevDay)
						tvlPrevWeek && (finalTvlPrevWeek = (finalTvlPrevWeek || 0) + tvlPrevWeek)
						tvlPrevMonth && (finalTvlPrevMonth = (finalTvlPrevMonth || 0) + tvlPrevMonth)
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
					mcaptvl
				}
			}
		)

		if (defaultSortingColumn === undefined) {
			return updatedProtocols.sort((a, b) => b.tvl - a.tvl)
		} else {
			return updatedProtocols.sort((a, b) => {
				if (dir === 'asc') {
					return a[defaultSortingColumn] - b[defaultSortingColumn]
				} else return b[defaultSortingColumn] - a[defaultSortingColumn]
			})
		}
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

export const useGroupChainsByParent = (chains: Readonly<IChain[]>, groupData: IGroupData): GroupChain[] => {
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
			let protocols: DataValue = null

			finalData[parentName] = {}

			const parentData = chains.find((item) => item.name === parentName)
			if (parentData) {
				tvl = parentData.tvl || null
				tvlPrevDay = parentData.tvlPrevDay || null
				tvlPrevWeek = parentData.tvlPrevWeek || null
				tvlPrevMonth = parentData.tvlPrevMonth || null
				mcap = parentData.mcap || null
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

	let extraTvlsEnabled = extraTvls

	let tvlKey = 'tvl'
	if (tvlTypes !== null) {
		tvlKey = tvlTypes[tvlKey]
		extraTvlsEnabled = Object.fromEntries(
			Object.entries(extraTvlsEnabled).map(([toggle, val]) => [tvlTypes[toggle], val])
		)
	}

	const { data, daySum } = useMemo(() => {
		const daySum = {}
		const data = chains.map(([date, values]) => {
			const tvls: IChainTvl = {}
			let totalDaySum = 0

			Object.entries(values).forEach(([name, chainTvls]: ChainTvlsByDay) => {
				let sum = chainTvls[tvlKey]
				totalDaySum += chainTvls[tvlKey] || 0

				for (const c in chainTvls) {
					if ((c === 'doublecounted' || c === 'd') && !extraTvlsEnabled['doublecounted']) {
						sum -= chainTvls[c]
						totalDaySum -= chainTvls[c]
					}

					if ((c === 'liquidstaking' || c === 'l') && !extraTvlsEnabled['liquidstaking']) {
						sum -= chainTvls[c]
						totalDaySum -= chainTvls[c]
					}

					if (c.toLowerCase() === 'dcandlsoverlap' || c === 'dl') {
						if (!extraTvlsEnabled['doublecounted'] || !extraTvlsEnabled['liquidstaking']) {
							sum += chainTvls[c]
							totalDaySum += chainTvls[c]
						}
					}

					if (extraTvlsEnabled[c.toLowerCase()] && c !== 'doublecounted' && c !== 'liquidstaking') {
						sum += chainTvls[c]
						totalDaySum += chainTvls[c]
					}
				}
				tvls[name] = sum
			})
			daySum[date] = totalDaySum
			return { date, ...tvls }
		})
		return { data, daySum }
	}, [chains, extraTvlsEnabled, tvlKey])

	return { data, daySum }
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

// PEGGED ASSETS
export const useCalcCirculating = (filteredPeggedAssets: IPegged[]) => {
	const [extraPeggedEnabled] = useStablecoinsManager()

	const peggedAssetTotals = useMemo(() => {
		const updatedPeggedAssets = filteredPeggedAssets.map(
			({ circulating, unreleased, pegType, pegDeviation, ...props }) => {
				if (extraPeggedEnabled['unreleased'] && unreleased) {
					circulating += unreleased
				}

				let floatingPeg = false
				if (pegType === 'peggedVAR') {
					floatingPeg = true
				}

				let depeggedTwoPercent = false
				if (2 < Math.abs(pegDeviation)) {
					depeggedTwoPercent = true
				}

				return {
					circulating,
					unreleased,
					pegType,
					pegDeviation,
					depeggedTwoPercent,
					floatingPeg,
					...props
				}
			}
		)

		return updatedPeggedAssets.sort((a, b) => b.mcap - a.mcap)
	}, [filteredPeggedAssets, extraPeggedEnabled])

	return peggedAssetTotals
}

// returns circulating by day for a group of tokens
export const useCalcGroupExtraPeggedByDay = (chains) => {
	const [extraPeggedEnabled] = useStablecoinsManager()

	const { data, daySum } = useMemo(() => {
		const daySum = {}

		const data = chains.map(([date, values]) => {
			const circulatings: IChainTvl = {}
			let totalDaySum = 0
			Object.entries(values).forEach(([name, chainCirculating]: ChainTvlsByDay) => {
				let sum = chainCirculating.circulating
				totalDaySum += chainCirculating.circulating
				if (extraPeggedEnabled['unreleased'] && chainCirculating.unreleased) {
					sum += chainCirculating.unreleased
					totalDaySum += chainCirculating.unreleased
				}

				circulatings[name] = sum
			})
			daySum[date] = totalDaySum
			return { date, ...circulatings }
		})
		return { data, daySum }
	}, [chains, extraPeggedEnabled])

	return { data, daySum }
}

export const useGroupChainsPegged = (chains, groupData: IGroupData): GroupChainPegged[] => {
	const [groupsEnabled] = useDefiChainsManager()
	const data: GroupChainPegged[] = useMemo(() => {
		const finalData = {}
		const addedChains = []
		for (const parentName in groupData) {
			let mcap: DataValue = null
			let unreleased: DataValue = null
			let bridgedTo: DataValue = null
			let minted: DataValue = null
			let dominance: { name: string; value: number } | null = null
			let mcaptvl: DataValue = null

			finalData[parentName] = {}

			const parentData = chains.find((item) => item.name === parentName)
			if (parentData) {
				mcap = parentData.mcap || null
				unreleased = parentData.unreleased || null
				bridgedTo = parentData.bridgedTo || null
				minted = parentData.minted || null
				finalData[parentName] = {
					...parentData,
					subRows: [parentData]
				}

				addedChains.push(parentName)
			}

			let addedChildren = false
			for (const type in groupData[parentName]) {
				if (groupsEnabled[type] === true) {
					for (const child of groupData[parentName][type]) {
						const childData = chains.find((item) => item.name === child)

						const alreadyAdded = (finalData[parentName].subRows ?? []).find((p) => p.name === child)

						if (childData && alreadyAdded === undefined) {
							mcap += childData.mcap
							unreleased += childData.unreleased
							bridgedTo += childData.bridgedTo
							minted += childData.minted
							dominance = null
							mcaptvl = null
							const subChains = finalData[parentName].subRows || []

							finalData[parentName] = {
								...finalData[parentName],
								mcap,
								unreleased,
								bridgedTo,
								minted,
								dominance,
								mcaptvl,
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
				if (finalData[parentName].mcap === undefined) {
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
		return (Object.values(finalData) as GroupChainPegged[]).sort((a, b) => b.mcap - a.mcap)
	}, [chains, groupData, groupsEnabled])

	return data
}

export const useGroupBridgeData = (chains: IPegged[], bridgeInfoObject: BridgeInfo): GroupChainPegged[] => {
	const data: GroupChainPegged[] = useMemo(() => {
		const finalData = {}
		for (const parent of chains) {
			finalData[parent.name] = {}
			const parentBridges = parent.bridges
			const percentBridged =
				parent.circulating && parent.bridgedAmount && (parent.bridgedAmount / parent.circulating) * 100.0
			const percentBridgedtoDisplay = percentBridged < 100 ? percentBridged.toFixed(2) + '%' : '100%'
			if (!parentBridges || Object.keys(parentBridges).length === 0) {
				finalData[parent.name] = {
					...parent,
					bridgeInfo: {
						name: '-'
					}
				}
			} else {
				const parentBridgeIDsArray = Object.keys(parentBridges)
				const parentFirstBridgeID = parentBridgeIDsArray[0]
				const parentFirstBridgeInfo = bridgeInfoObject[parentFirstBridgeID] ?? { name: 'not-found' }
				const parentFirstBridgeSourcesArray = Object.keys(parentBridges[parentFirstBridgeID])
				if (
					parentBridgeIDsArray.length === 1 &&
					parentFirstBridgeSourcesArray.length === 1 &&
					parent.bridgedAmount === parent.circulating
				) {
					let childData = {}
					if (parentFirstBridgeInfo.name === 'Natively Issued') {
						parentFirstBridgeInfo.name = '-'
						childData = {
							...parent,
							bridgeInfo: parentFirstBridgeInfo,
							bridgedAmount: percentBridgedtoDisplay,
							name: `Natively Issued`
						}
					} else {
						const sourceChain = parentFirstBridgeSourcesArray[0] ?? 'not-found'
						childData = {
							...parent,
							bridgeInfo: parentFirstBridgeInfo,
							bridgedAmount: percentBridgedtoDisplay,
							name: `Bridged from ${capitalizeFirstLetter(sourceChain)}`
						}
					}
					finalData[parent.name] = {
						...parent,
						bridgeInfo: parentFirstBridgeInfo,
						bridgedAmount: percentBridgedtoDisplay,
						subRows: [childData]
					}
				} else {
					let totalBridged = 0
					for (const bridgeID in parentBridges) {
						for (const sourceChain in parentBridges[bridgeID]) {
							totalBridged += parentBridges[bridgeID][sourceChain].amount ?? 0
						}
					}
					for (const bridgeID in parentBridges) {
						for (const sourceChain in parentBridges[bridgeID]) {
							const bridgeInfo = bridgeInfoObject[bridgeID] ?? {
								name: 'not-found'
							}
							const subChains = finalData[parent.name].subRows || []
							const parentAmountBridged = parentBridges[bridgeID][sourceChain].amount
							const percentBridgedBreakdown =
								parentAmountBridged &&
								totalBridged &&
								(parentAmountBridged / totalBridged) * (percentBridged > 100 ? 100 : percentBridged)
							const percentBridgedBreakdownToDisplay =
								percentBridgedBreakdown < 100 ? percentBridgedBreakdown.toFixed(2) + '%' : '100%'

							const childData = {
								...parent,
								name: `Bridged from ${capitalizeFirstLetter(sourceChain)}`,
								bridgeInfo: bridgeInfo,
								bridgedAmount: percentBridgedBreakdownToDisplay,
								circulating: parentAmountBridged,
								change_1d: null,
								change_7d: null,
								change_1m: null
							}
							finalData[parent.name] = {
								...parent,
								bridgedAmount: percentBridgedtoDisplay,
								bridgeInfo: {
									name: '-'
								},
								subRows: [...subChains, childData]
							}
						}
					}
				}
			}
		}
		return (Object.values(finalData) as GroupChainPegged[])
			.filter((chain) => chain.name)
			.sort((a, b) => b.circulating - a.circulating)
	}, [chains, bridgeInfoObject])

	return data
}
