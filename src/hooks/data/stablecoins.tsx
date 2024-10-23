import * as React from 'react'
import { useMemo } from 'react'
import { useRouter } from 'next/router'
import { getDominancePercent, getPrevPeggedTotalFromChart } from '~/utils'
import { useDefiChainsManager, useStablecoinsManager } from '~/contexts/LocalStorage'
import { capitalizeFirstLetter } from '~/utils'

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
	delisted?: boolean
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

interface IChainTvl {
	[key: string]: number
}

type DataValue = number | null

interface IGroupData {
	[key: string]: {}
}

type ChainTvlsByDay = [string, IChainTvl]

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

		return updatedPeggedAssets.sort((a, b) => b.mcap - a.mcap).filter((pegged) => !pegged.delisted)
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

	const dataWithExtraPeggedAndDominanceByDay = data.map(({ date, ...values }) => {
		const shares = {}

		for (const value in values) {
			shares[value] = getDominancePercent(values[value], daySum[date])
		}

		return { date, ...shares }
	})

	return { data, daySum, dataWithExtraPeggedAndDominanceByDay }
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
								mcaptvl: mcaptvl !== null ? +mcaptvl.toFixed(2) : null,
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
			const percentBridgedtoDisplay = percentBridged
				? percentBridged < 100
					? percentBridged.toFixed(2) + '%'
					: '100%'
				: null
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

export const useBuildPeggedChartData = (
	chartDataByAssetOrChain,
	assetsOrChainsList,
	filteredIndexes?,
	issuanceType = 'mcap',
	selectedChain?,
	totalChartTooltipLabel = 'Mcap'
) => {
	const { peggedAreaChartData, peggedAreaTotalData, stackedDataset, tokenInflows, tokenInflowNames, usdInflows } =
		useMemo(() => {
			const backfilledChains = [
				'All',
				'Ethereum',
				'BSC',
				'Avalanche',
				'Arbitrum',
				'Optimism',
				'Fantom',
				'Polygon',
				'Gnosis',
				'Celo',
				'Harmony',
				'Moonriver',
				'Aztec',
				'Loopring',
				'Starknet',
				'ZKsync',
				'Boba',
				'Metis',
				'Moonbeam',
				'Syscoin',
				'OKExChain',
				'IoTeX',
				'Heco'
			]
			let unformattedAreaData = {}
			let unformattedTotalData = {}
			let stackedDatasetObject = {}
			let unformattedTokenInflowData = {}
			let assetAddedToInflows = assetsOrChainsList.reduce((acc, curr) => ({ ...acc, [curr]: false }), {})
			chartDataByAssetOrChain.map((charts, i) => {
				if (!charts || !charts.length || !filteredIndexes.includes(i)) return
				charts.forEach((chart, j) => {
					const mcap = getPrevPeggedTotalFromChart([chart], 0, issuanceType) // 'issuanceType' and 'mcap' here are 'circulating' values on /stablecoin pages, and 'mcap' otherwise
					const prevDayMcap = getPrevPeggedTotalFromChart([charts[j - 1]], 0, issuanceType)
					const assetOrChain = assetsOrChainsList[i]
					const date = chart.date
					if (date > 1596248105 && mcap) {
						if (backfilledChains.includes(selectedChain) || date > 1652241600) {
							// for individual chains data is currently only backfilled to May 11, 2022
							unformattedAreaData[date] = unformattedAreaData[date] || {}
							unformattedAreaData[date][assetsOrChainsList[i]] = mcap

							unformattedTotalData[date] = (unformattedTotalData[date] ?? 0) + mcap

							if (mcap !== null && mcap !== 0) {
								if (stackedDatasetObject[date] == undefined) {
									stackedDatasetObject[date] = {}
								}
								const b = stackedDatasetObject[date][assetOrChain]
								stackedDatasetObject[date][assetOrChain] = { ...b, circulating: mcap ?? 0 }
							}

							const diff = (mcap ?? 0) - (prevDayMcap ?? 0)
							// the first day's inflow is not added to prevent large inflows on the day token is first tracked
							if (assetAddedToInflows[assetOrChain]) {
								unformattedTokenInflowData[date] = unformattedTokenInflowData[date] || {}
								unformattedTokenInflowData[date][assetsOrChainsList[i]] = diff
							}
							if (diff) {
								assetAddedToInflows[assetOrChain] = true
							}
						}
					}
				})
			})

			const peggedAreaChartData = Object.entries(unformattedAreaData).map(([date, chart]) => {
				if (typeof chart === 'object') {
					return {
						date: date,
						...chart
					}
				}
			})

			const peggedAreaTotalData = Object.entries(unformattedTotalData).map(([date, mcap]) => {
				return {
					date: date,
					[totalChartTooltipLabel]: mcap
				}
			})

			const stackedDataset = Object.entries(stackedDatasetObject)

			const secondsInDay = 3600 * 24
			let zeroTokenInflows = 0
			let zeroUsdInfows = 0
			let tokenInflows = []
			let usdInflows = []
			const tokenSet: Set<string> = new Set()
			Object.entries(unformattedTokenInflowData).map(([date, chart]) => {
				if (typeof chart === 'object') {
					let dayDifference = 0
					let tokenDayDifference = {}
					for (const token in chart) {
						tokenSet.add(token)
						const diff = chart[token]
						if (!Number.isNaN(diff)) {
							// Here, the inflow tokens could be restricted to top daily top tokens, but they aren't. Couldn't find good UX doing so.
							tokenDayDifference[token] = diff
							dayDifference += diff
						}
					}

					if (dayDifference === 0) {
						zeroUsdInfows++
					}

					if (Object.keys(tokenDayDifference)?.length === 0) {
						zeroTokenInflows++
					}

					// the dates on the inflows are all off by 1 (because timestamps are at 00:00?), so they are moved forward 1 day
					const adjustedDate = (parseInt(date) + secondsInDay).toString()

					tokenInflows.push({
						...tokenDayDifference,
						date: adjustedDate
					})

					usdInflows.push([adjustedDate, dayDifference])
				}
			})

			const tokenInflowNames = zeroTokenInflows === tokenInflows.length ? ['USDT'] : (Array.from(tokenSet) as any)

			tokenInflows = zeroTokenInflows === tokenInflows.length ? [{ USDT: 0, date: '1652486400' }] : tokenInflows
			usdInflows = zeroUsdInfows === usdInflows.length ? [['1652486400', 0]] : usdInflows

			return { peggedAreaChartData, peggedAreaTotalData, stackedDataset, tokenInflows, tokenInflowNames, usdInflows }
		}, [
			chartDataByAssetOrChain,
			assetsOrChainsList,
			filteredIndexes,
			issuanceType,
			selectedChain,
			totalChartTooltipLabel
		])
	return { peggedAreaChartData, peggedAreaTotalData, stackedDataset, tokenInflows, tokenInflowNames, usdInflows }
}

export const useFormatStablecoinQueryParams = ({
	stablecoinAttributeOptions,
	stablecoinPegTypeOptions,
	stablecoinBackingOptions
}) => {
	const router = useRouter()
	const { attribute, pegtype, backing } = router.query

	return React.useMemo(() => {
		let selectedAttributes = [],
			selectedPegTypes = [],
			selectedBackings = []

		if (attribute) {
			if (typeof attribute === 'string') {
				selectedAttributes = attribute === 'None' ? [] : [attribute]
			} else {
				selectedAttributes = [...attribute]
			}
		} else {
			selectedAttributes = [...stablecoinAttributeOptions.map((option) => option.key)]
		}

		if (pegtype) {
			if (typeof pegtype === 'string') {
				selectedPegTypes = pegtype === 'None' ? [] : [pegtype]
			} else {
				selectedPegTypes = [...pegtype]
			}
		} else selectedPegTypes = [...stablecoinPegTypeOptions.map((option) => option.key)]

		if (backing) {
			if (typeof backing === 'string') {
				selectedBackings = backing === 'None' ? [] : [backing]
			} else {
				selectedBackings = [...backing]
			}
		} else selectedBackings = [...stablecoinBackingOptions.map((option) => option.key)]

		return {
			selectedAttributes,
			selectedPegTypes,
			selectedBackings
		}
	}, [attribute, pegtype, backing, stablecoinAttributeOptions, stablecoinPegTypeOptions, stablecoinBackingOptions])
}
