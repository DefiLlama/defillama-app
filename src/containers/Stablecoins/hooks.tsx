import { useRouter } from 'next/router'
import * as React from 'react'
import { useMemo } from 'react'
import { isChainsCategoryGroupKey, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
// oxlint-disable-next-line no-unused-vars
import { capitalizeFirstLetter, formatNum, getDominancePercent } from '~/utils'
import type { StablecoinFilterOption } from './Filters'

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

type StablecoinCirculatingInput = {
	name: string
	circulating?: number | null
	unreleased?: number | null
	pegType?: string | null
	pegDeviation?: number | null
	mcap?: number | null
	delisted?: boolean
}

type StablecoinCirculatingOutput<T extends StablecoinCirculatingInput> = T & {
	circulating: number
	unreleased: number
	pegType: string
	pegDeviation: number | null
	depeggedTwoPercent: boolean
	floatingPeg: boolean
}

type StablecoinBridgeInfo = {
	name: string
	link?: string
}

/** Minimal shape required by `useGroupBridgeData` for each chain entry. */
type GroupBridgeDataInput = {
	name: string
	symbol: string
	circulating: number
	unreleased: number
	bridgedAmount: number | null
	change_1d: number | null
	change_7d: number | null
	change_1m: number | null
	bridges: {
		[bridgeID: string]: {
			[source: string]: {
				amount: number
			}
		}
	} | null
	circulatingPrevDay: number | null
	circulatingPrevWeek: number | null
	circulatingPrevMonth: number | null
}

type StablecoinUsageByChainBase = Omit<
	GroupBridgeDataInput,
	'bridgedAmount' | 'change_1d' | 'change_7d' | 'change_1m'
> & {
	bridgedAmount: string | number | null
	change_1d: number | null
	change_7d: number | null
	change_1m: number | null
}

type StablecoinUsageByChainRow = StablecoinUsageByChainBase & {
	bridgeInfo: StablecoinBridgeInfo
	subRows?: StablecoinUsageByChainRow[]
}

type BridgeInfo = {
	[bridgeID: string]: StablecoinBridgeInfo
}

interface IChainTvl {
	[key: string]: number
}

interface IStackedCirculatingValue {
	circulating: number
	unreleased?: number
}

type IStackedDatasetPoint = [string | number, Record<string, IStackedCirculatingValue>]
type IExtraPeggedByDayPoint = { date: number } & Record<string, number>

type DataValue = number | null

interface IGroupData {
	[key: string]: Record<string, string[]>
}

export const useCalcCirculating = <T extends StablecoinCirculatingInput = IPegged>(
	filteredPeggedAssets: T[],
	includeUnreleased?: boolean
): StablecoinCirculatingOutput<T>[] => {
	const shouldIncludeUnreleased = Boolean(includeUnreleased)

	const peggedAssetTotals = useMemo<StablecoinCirculatingOutput<T>[]>(() => {
		const updatedPeggedAssets = filteredPeggedAssets.map((asset) => {
			const unreleased = Number(asset.unreleased ?? 0)
			const pegType = asset.pegType ?? ''
			const rawPegDeviation = asset.pegDeviation
			const numericPegDeviation =
				typeof rawPegDeviation === 'number' ? rawPegDeviation : rawPegDeviation != null ? Number(rawPegDeviation) : null
			const pegDeviation = Number.isFinite(numericPegDeviation) ? numericPegDeviation : null

			let circulating = Number(asset.circulating ?? 0)
			if (shouldIncludeUnreleased && unreleased) {
				circulating += unreleased
			}

			const floatingPeg = pegType === 'peggedVAR'
			const depeggedTwoPercent = pegDeviation != null && 2 < Math.abs(pegDeviation)

			return {
				...asset,
				circulating,
				unreleased,
				pegType,
				pegDeviation,
				depeggedTwoPercent,
				floatingPeg
			} as StablecoinCirculatingOutput<T>
		})

		return updatedPeggedAssets
			.sort((a, b) => Number(b.mcap ?? 0) - Number(a.mcap ?? 0))
			.filter((pegged) => !pegged.delisted)
	}, [filteredPeggedAssets, shouldIncludeUnreleased])

	return peggedAssetTotals
}

// returns circulating by day for a group of tokens
export const useCalcGroupExtraPeggedByDay = (chains: IStackedDatasetPoint[], includeUnreleased?: boolean) => {
	const shouldIncludeUnreleased = Boolean(includeUnreleased)

	const { data, daySum } = useMemo(() => {
		const daySum: Record<number, number> = {}

		const data: IExtraPeggedByDayPoint[] = chains.map(([date, values]) => {
			const dateNumber = Number(date)
			const circulatings: IChainTvl = {}
			let totalDaySum = 0
			for (const name in values) {
				const chainCirculating = values[name]
				let sum = chainCirculating.circulating
				totalDaySum += chainCirculating.circulating
				if (shouldIncludeUnreleased && chainCirculating.unreleased) {
					sum += chainCirculating.unreleased
					totalDaySum += chainCirculating.unreleased
				}

				circulatings[name] = sum
			}
			daySum[dateNumber] = totalDaySum
			return { date: dateNumber, ...circulatings }
		})
		return { data, daySum }
	}, [chains, shouldIncludeUnreleased])

	const dataWithExtraPeggedAndDominanceByDay = useMemo(() => {
		return data.map(({ date, ...values }): IExtraPeggedByDayPoint => {
			const shares: Record<string, number> = {}

			for (const key in values) {
				shares[key] = getDominancePercent(values[key], daySum[date] ?? 0)
			}

			return { date, ...shares }
		})
	}, [data, daySum])

	return { data, daySum, dataWithExtraPeggedAndDominanceByDay }
}

interface StablecoinsChainsRow {
	name: string
	mcap: number | null
	unreleased: number | null
	bridgedTo: number | null
	minted: number | null
	dominance?: { name: string; value: number | string | null } | null
	change_1d?: number | null
	change_7d?: number | null
	change_1m?: number | null
	mcaptvl?: number | null
	subRows?: StablecoinsChainsRow[]
}

export const useGroupChainsPegged = (chains: StablecoinsChainsRow[], groupData: IGroupData): StablecoinsChainsRow[] => {
	const [groupsEnabled] = useLocalStorageSettingsManager('tvl_chains')
	const data: StablecoinsChainsRow[] = useMemo(() => {
		// Build lookup map for O(1) access by name
		const chainsByName = new Map<string, StablecoinsChainsRow>(chains.map((item) => [item.name, item]))

		const finalData: Record<string, StablecoinsChainsRow> = {}
		const addedChains = new Set<string>()
		for (const parentName in groupData) {
			let mcap: DataValue = null
			let unreleased: DataValue = null
			let bridgedTo: DataValue = null
			let minted: DataValue = null
			let dominance: { name: string; value: number | string | null } | null = null
			// oxlint-disable-next-line no-unused-vars
			let mcaptvl: DataValue = null

			const parentData = chainsByName.get(parentName)
			if (parentData) {
				mcap = parentData.mcap || null
				unreleased = parentData.unreleased || null
				bridgedTo = parentData.bridgedTo || null
				minted = parentData.minted || null
				finalData[parentName] = {
					...parentData,
					subRows: [parentData]
				}

				addedChains.add(parentName)
			}

			let addedChildren = false
			// O(1) Set lookup for already added children (built once per parent)
			const alreadyAddedNames = new Set((finalData[parentName]?.subRows ?? []).map((p) => p.name))

			for (const type in groupData[parentName]) {
				if (!isChainsCategoryGroupKey(type) || groupsEnabled[type] !== true) {
					continue
				}

				for (const child of groupData[parentName][type]) {
					const childData = chainsByName.get(child)

					// O(1) Set lookup instead of O(n) .find()
					const alreadyAdded = alreadyAddedNames.has(child)

					if (childData && !alreadyAdded) {
						mcap = (mcap ?? 0) + (childData.mcap ?? 0)
						unreleased = (unreleased ?? 0) + (childData.unreleased ?? 0)
						bridgedTo = (bridgedTo ?? 0) + (childData.bridgedTo ?? 0)
						minted = (minted ?? 0) + (childData.minted ?? 0)
						dominance = null
						mcaptvl = null
						const subChains = finalData[parentName]?.subRows || []

						finalData[parentName] = {
							...finalData[parentName],
							mcap,
							unreleased,
							bridgedTo,
							minted,
							dominance,
							mcaptvl: null,
							name: parentName,
							subRows: [...subChains, childData]
						}
						addedChains.add(child)
						alreadyAddedNames.add(child)
						addedChildren = true
					}
				}
			}
			if (!addedChildren) {
				if (finalData[parentName]?.mcap === undefined) {
					delete finalData[parentName]
				} else if (parentData) {
					finalData[parentName] = parentData
				}
			}
		}

		for (const item of chains) {
			if (!addedChains.has(item.name)) {
				finalData[item.name] = item
			}
		}
		// Use for..in instead of Object.values() to avoid intermediate array
		const finalDataArray: (typeof finalData)[string][] = []
		for (const key in finalData) {
			finalDataArray.push(finalData[key])
		}
		return finalDataArray.sort((a, b) => (b.mcap ?? 0) - (a.mcap ?? 0))
	}, [chains, groupData, groupsEnabled])

	return data
}

export const useGroupBridgeData = (
	chains: GroupBridgeDataInput[],
	bridgeInfoObject: BridgeInfo
): StablecoinUsageByChainRow[] => {
	const data: StablecoinUsageByChainRow[] = useMemo(() => {
		const finalData: Record<string, StablecoinUsageByChainRow> = {}
		for (const parent of chains) {
			const parentBridges = parent.bridges
			const percentBridged =
				parent.circulating && parent.bridgedAmount && (parent.bridgedAmount / parent.circulating) * 100.0
			const percentBridgedtoDisplay = percentBridged
				? percentBridged < 100
					? percentBridged.toFixed(2) + '%'
					: '100%'
				: null
			let hasParentBridges = false
			if (parentBridges) {
				for (const _ in parentBridges) {
					hasParentBridges = true
					break
				}
			}
			if (!parentBridges || !hasParentBridges) {
				finalData[parent.name] = {
					...parent,
					bridgeInfo: {
						name: '-'
					}
				}
			} else {
				const parentBridgeIDsArray: string[] = []
				for (const parentBridgeId in parentBridges) {
					parentBridgeIDsArray.push(parentBridgeId)
				}
				const parentFirstBridgeID = parentBridgeIDsArray[0]
				const parentFirstBridgeInfo = bridgeInfoObject[parentFirstBridgeID] ?? { name: 'not-found' }
				const parentFirstBridgeSourcesArray: string[] = []
				for (const sourceChain in parentBridges[parentFirstBridgeID]) {
					parentFirstBridgeSourcesArray.push(sourceChain)
				}
				if (
					parentBridgeIDsArray.length === 1 &&
					parentFirstBridgeSourcesArray.length === 1 &&
					parent.bridgedAmount === parent.circulating
				) {
					let childData: StablecoinUsageByChainRow
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
							const subChains = finalData[parent.name]?.subRows || []
							const parentAmountBridged = parentBridges[bridgeID][sourceChain].amount
							const effectivePercentBridged = typeof percentBridged === 'number' ? percentBridged : 0
							const percentBridgedBreakdown =
								parentAmountBridged && totalBridged
									? (parentAmountBridged / totalBridged) *
										(effectivePercentBridged > 100 ? 100 : effectivePercentBridged)
									: 0
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
		// Use for..in instead of Object.values() to avoid intermediate array
		const finalDataArray: (typeof finalData)[string][] = []
		for (const key in finalData) {
			finalDataArray.push(finalData[key])
		}
		return finalDataArray.filter((chain) => chain.name).sort((a, b) => b.circulating - a.circulating)
	}, [chains, bridgeInfoObject])

	return data
}

export const parseBooleanQueryParam = (value: string | string[] | undefined): boolean => {
	if (Array.isArray(value)) return value.some((v) => parseBooleanQueryParam(v))
	if (typeof value !== 'string') return false
	const normalized = value.trim().toLowerCase()
	return normalized === 'true' || normalized === '1' || normalized === 'yes'
}

// Helper to parse exclude query param to Set
const parseExcludeParam = (param: string | string[] | undefined): Set<string> => {
	if (!param) return new Set()
	if (typeof param === 'string') return new Set([param])
	return new Set(param)
}

export const useFormatStablecoinQueryParams = ({
	stablecoinAttributeOptions,
	stablecoinPegTypeOptions,
	stablecoinBackingOptions
}: {
	stablecoinAttributeOptions: ReadonlyArray<StablecoinFilterOption>
	stablecoinPegTypeOptions: ReadonlyArray<StablecoinFilterOption>
	stablecoinBackingOptions: ReadonlyArray<StablecoinFilterOption>
}) => {
	const router = useRouter()
	const { attribute, excludeAttribute, pegtype, excludePegtype, backing, excludeBacking } = router.query

	return React.useMemo(() => {
		// Fast path: when no stablecoin filter params are present in URL, keep defaults as-is.
		if (
			attribute == null &&
			excludeAttribute == null &&
			pegtype == null &&
			excludePegtype == null &&
			backing == null &&
			excludeBacking == null
		) {
			return {
				selectedAttributes: stablecoinAttributeOptions.map((option) => option.key),
				selectedPegTypes: stablecoinPegTypeOptions.map((option) => option.key),
				selectedBackings: stablecoinBackingOptions.map((option) => option.key)
			}
		}

		// Parse exclude sets upfront
		const excludeAttributeSet = parseExcludeParam(excludeAttribute)
		const excludePegtypeSet = parseExcludeParam(excludePegtype)
		const excludeBackingSet = parseExcludeParam(excludeBacking)

		// Build selectedAttributes and filter out excludes inline
		let attributes: string[]
		if (attribute) {
			if (typeof attribute === 'string') {
				attributes = attribute === 'None' ? [] : [attribute]
			} else {
				attributes = [...attribute]
			}
		} else {
			attributes = stablecoinAttributeOptions.map((option) => option.key)
		}
		const selectedAttributes =
			excludeAttributeSet.size > 0 ? attributes.filter((a) => !excludeAttributeSet.has(a)) : attributes

		// Build selectedPegTypes and filter out excludes inline
		let pegTypes: string[]
		if (pegtype) {
			if (typeof pegtype === 'string') {
				pegTypes = pegtype === 'None' ? [] : [pegtype]
			} else {
				pegTypes = [...pegtype]
			}
		} else {
			pegTypes = stablecoinPegTypeOptions.map((option) => option.key)
		}
		const selectedPegTypes = excludePegtypeSet.size > 0 ? pegTypes.filter((p) => !excludePegtypeSet.has(p)) : pegTypes

		// Build selectedBackings and filter out excludes inline
		let backings: string[]
		if (backing) {
			if (typeof backing === 'string') {
				backings = backing === 'None' ? [] : [backing]
			} else {
				backings = [...backing]
			}
		} else {
			backings = stablecoinBackingOptions.map((option) => option.key)
		}
		const selectedBackings = excludeBackingSet.size > 0 ? backings.filter((b) => !excludeBackingSet.has(b)) : backings

		return {
			selectedAttributes,
			selectedPegTypes,
			selectedBackings
		}
	}, [
		attribute,
		excludeAttribute,
		pegtype,
		excludePegtype,
		backing,
		excludeBacking,
		stablecoinAttributeOptions,
		stablecoinPegTypeOptions,
		stablecoinBackingOptions
	])
}
