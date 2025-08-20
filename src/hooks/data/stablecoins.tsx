import * as React from 'react'
import { useMemo } from 'react'
import { useRouter } from 'next/router'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { capitalizeFirstLetter, formattedNum, getDominancePercent } from '~/utils'

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
	[key: string]: Record<string, string[]>
}

type ChainTvlsByDay = [string, IChainTvl]

export const useCalcCirculating = (filteredPeggedAssets: IPegged[]) => {
	const [extraPeggedEnabled] = useLocalStorageSettingsManager('stablecoins')

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
	const [extraPeggedEnabled] = useLocalStorageSettingsManager('stablecoins')

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
	const [groupsEnabled] = useLocalStorageSettingsManager('tvl_chains')
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
								mcaptvl: mcaptvl !== null ? +formattedNum(mcaptvl) : null,
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
