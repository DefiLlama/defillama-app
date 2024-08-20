import { IFormattedProtocol, IParentProtocol, TCompressedChain } from '~/api/types'
import { ISettings } from '~/contexts/types'
import { getDominancePercent, getPercentChange } from '~/utils'
import { groupProtocols } from './utils'
import { IOverviewProps, getAnnualizedRatio } from '~/api/categories/adaptors'
import { removedCategories } from '~/constants'

interface IData {
	tvl: number
	tvlPrevDay: number
	tvlPrevWeek: number
	tvlPrevMonth: number
	extraTvl?: {
		[key: string]: { tvl: number; tvlPrevDay: number; tvlPrevWeek: number; tvlPrevMonth: number }
	}
	mcap?: number
	name: string
}

interface Breakdown {
	[key: string]: string
}

export interface ChainAssets {
	canonical: {
		total: string
		breakdown: Breakdown
	}
	native: {
		total: string
		breakdown: Breakdown
	}
	thirdParty: {
		total: string
		breakdown: Breakdown
	}
	total: {
		breakdown: Breakdown
		total: string
	}
	ownTokens: {
		breakdown: Breakdown
		total: string
	}
}

interface IFormattedDataWithExtraTvlProps {
	data: Readonly<Array<IData>>
	defaultSortingColumn?: string
	dir?: string
	applyLqAndDc?: boolean
	extraTvlsEnabled: ISettings
	chainAssets?: ChainAssets
}

export function formatDataWithExtraTvls({
	data,
	defaultSortingColumn,
	dir,
	applyLqAndDc,
	extraTvlsEnabled,
	chainAssets
}: IFormattedDataWithExtraTvlProps) {
	const updatedProtocols = data.map(({ tvl, tvlPrevDay, tvlPrevWeek, tvlPrevMonth, extraTvl, mcap, ...props }) => {
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

		const mcaptvl = mcap && finalTvl ? +(mcap / finalTvl).toFixed(2) : null

		let assets = null

		if (chainAssets) {
			assets = chainAssets?.[props?.name?.toLowerCase()]

			if (assets && extraTvlsEnabled.govtokens && assets?.ownTokens) {
				const total = assets.total.total + assets.ownTokens.total
				assets = { ...assets, total: { ...assets.total, total } }
			}
		}

		return {
			...props,
			chainAssets: assets ?? null,
			tvl: finalTvl < 0 ? 0 : finalTvl,
			tvlPrevDay: finalTvlPrevDay < 0 ? 0 : finalTvlPrevDay,
			tvlPrevWeek: finalTvlPrevWeek < 0 ? 0 : finalTvlPrevWeek,
			tvlPrevMonth: finalTvlPrevMonth < 0 ? 0 : finalTvlPrevMonth,
			change_1d: change1d,
			change_7d: change7d,
			change_1m: change1m,
			mcap,
			mcaptvl
		}
	})

	if (defaultSortingColumn === undefined) {
		return updatedProtocols.sort((a, b) => b.tvl - a.tvl)
	} else {
		return updatedProtocols.sort((a, b) => {
			if (dir === 'asc') {
				return a[defaultSortingColumn] - b[defaultSortingColumn]
			} else return b[defaultSortingColumn] - a[defaultSortingColumn]
		})
	}
}

interface IGroupTvlsByDay {
	chains: Readonly<Array<TCompressedChain>>
	tvlTypes: any
	extraTvlsEnabled: ISettings
}

interface IChainTvl {
	[key: string]: number
}

type ChainTvlsByDay = [string, IChainTvl]

export function groupDataWithTvlsByDay({ chains, tvlTypes, extraTvlsEnabled }: IGroupTvlsByDay) {
	let extraTvls = { ...extraTvlsEnabled }

	let tvlKey = 'tvl'
	if (tvlTypes !== null) {
		tvlKey = tvlTypes[tvlKey]
		extraTvls = Object.fromEntries(Object.entries(extraTvls).map(([toggle, val]) => [tvlTypes[toggle], val]))
	}

	const daySum = {}

	const chainsWithExtraTvlsByDay = chains.map(([date, values]) => {
		const tvls: IChainTvl = {}
		let totalDaySum = 0

		Object.entries(values).forEach(([name, chainTvls]: ChainTvlsByDay) => {
			let sum = chainTvls[tvlKey]
			totalDaySum += chainTvls[tvlKey] || 0

			for (const c in chainTvls) {
				if ((c === 'doublecounted' || c === 'd') && !extraTvls['doublecounted']) {
					sum -= chainTvls[c]
					totalDaySum -= chainTvls[c]
				}

				if ((c === 'liquidstaking' || c === 'l') && !extraTvls['liquidstaking']) {
					sum -= chainTvls[c]
					totalDaySum -= chainTvls[c]
				}

				if (c.toLowerCase() === 'dcandlsoverlap' || c === 'dl') {
					if (!extraTvls['doublecounted'] || !extraTvls['liquidstaking']) {
						sum += chainTvls[c]
						totalDaySum += chainTvls[c]
					}
				}

				if (extraTvls[c.toLowerCase()] && c !== 'doublecounted' && c !== 'liquidstaking') {
					sum += chainTvls[c]
					totalDaySum += chainTvls[c]
				}
			}

			tvls[name] = sum
		})

		daySum[date] = totalDaySum

		return { date: Number(date), ...tvls }
	})

	const chainsWithExtraTvlsAndDominanceByDay = chainsWithExtraTvlsByDay.map(({ date, ...values }) => {
		const shares = {}

		for (const value in values) {
			shares[value] = getDominancePercent(values[value], daySum[date])
		}

		return { date, ...shares }
	})

	return { chainsWithExtraTvlsByDay, chainsWithExtraTvlsAndDominanceByDay }
}

export const formatProtocolsList = ({
	protocols,
	parentProtocols,
	extraTvlsEnabled,
	volumeData,
	feesData,
	noSubrows
}: {
	protocols: IFormattedProtocol[]
	parentProtocols: IParentProtocol[]
	extraTvlsEnabled: ISettings
	volumeData?: IOverviewProps['protocols']
	feesData?: IOverviewProps['protocols']
	noSubrows?: boolean
}) => {
	const checkExtras = {
		...extraTvlsEnabled,
		doublecounted: !extraTvlsEnabled.doublecounted
	}

	const final = {}

	const shouldModifyTvl = Object.values(checkExtras).every((t) => !t)

	for (const protocol of protocols) {
		const { tvl, tvlPrevDay, tvlPrevWeek, tvlPrevMonth, extraTvl, mcap, name, ...props } = protocol
		let finalTvl: number | null = tvl
		let finalTvlPrevDay: number | null = tvlPrevDay
		let finalTvlPrevWeek: number | null = tvlPrevWeek
		let finalTvlPrevMonth: number | null = tvlPrevMonth
		let strikeTvl = false

		if (shouldModifyTvl) {
			// keep liquid staking in same position in table but strike its tvl
			if (props.category === 'Liquid Staking' && !extraTvlsEnabled['liquidstaking']) {
				strikeTvl = true
			}

			if (removedCategories.includes(props.category)) {
				strikeTvl = true
			}

			Object.entries(extraTvl).forEach(([prop, propValues]) => {
				const { tvl, tvlPrevDay, tvlPrevWeek, tvlPrevMonth } = propValues

				if (
					prop === 'doublecounted' &&
					!extraTvlsEnabled['doublecounted'] &&
					(props.category === 'Liquid Staking' ? !extraTvlsEnabled['liquidstaking'] : true)
				) {
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
		}

		let change1d: number | null = getPercentChange(finalTvl, finalTvlPrevDay)
		let change7d: number | null = getPercentChange(finalTvl, finalTvlPrevWeek)
		let change1m: number | null = getPercentChange(finalTvl, finalTvlPrevMonth)

		const mcaptvl = mcap && finalTvl ? +(mcap / finalTvl).toFixed(2) : null

		// use undefined if the value is null, so we sort table columns correctly
		final[props.defillamaId] = {
			...props,
			extraTvl,
			name,
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
	}

	for (const protocol of feesData ?? []) {
		if (!final[protocol.defillamaId]) {
			final[protocol.defillamaId] = {
				name: protocol.displayName,
				chains: protocol.chains ?? []
			}
		}

		// use undefined if the value is null, so we sort table columns correctly
		final[protocol.defillamaId] = {
			...final[protocol.defillamaId],
			fees_24h: protocol.total24h ?? undefined,
			revenue_24h: protocol.revenue24h ?? undefined,
			holderRevenue_24h: protocol.dailyHoldersRevenue ?? undefined,
			fees_7d: protocol.total7d ?? undefined,
			revenue_7d: protocol.revenue7d ?? undefined,
			fees_30d: protocol.total30d ?? undefined,
			fees_1y: protocol.total1y ?? undefined,
			revenue_30d: protocol.revenue30d ?? undefined,
			revenue_1y: protocol.revenue1y ?? undefined,
			average_fees_1y: protocol.average1y ?? undefined,
			average_revenue_1y: protocol.averageRevenue1y ?? undefined,
			holdersRevenue30d: protocol.holdersRevenue30d ?? undefined,
			treasuryRevenue_24h: protocol.dailyProtocolRevenue ?? undefined,
			supplySideRevenue_24h: protocol.dailySupplySideRevenue ?? undefined,
			userFees_24h: protocol.dailyUserFees ?? undefined,
			cumulativeFees: protocol.totalAllTime ?? undefined
		}
	}

	for (const protocol of volumeData ?? []) {
		if (!final[protocol.defillamaId]) {
			final[protocol.defillamaId] = {
				name: protocol.displayName,
				chains: protocol.chains ?? []
			}
		}

		final[protocol.defillamaId] = {
			...final[protocol.defillamaId],
			volume_24h: protocol.total24h,
			volume_7d: protocol.total7d,
			volumeChange_7d: protocol['change_7dover7d'],
			cumulativeVolume: protocol.totalAllTime
		}
	}

	return (
		parentProtocols ? groupProtocols(Object.values(final), parentProtocols, noSubrows) : Object.values(final)
	) as Array<IFormattedProtocol>
}
