import { IFormattedProtocol, IParentProtocol, TCompressedChain } from '~/api/types'
import { ISettings } from '~/contexts/types'
import { getDominancePercent, getPercentChange } from '~/utils'
import { groupProtocols } from './utils'
import { IOverviewProps, getAnnualizedRatio } from '~/api/categories/adaptors'

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

interface IFormattedDataWithExtraTvlProps {
	data: Readonly<Array<IData>>
	defaultSortingColumn?: string
	dir?: string
	applyLqAndDc?: boolean
	extraTvlsEnabled: ISettings
}

export function formatDataWithExtraTvls({
	data,
	defaultSortingColumn,
	dir,
	applyLqAndDc,
	extraTvlsEnabled
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
	feesData
}: {
	protocols: IFormattedProtocol[]
	parentProtocols: IParentProtocol[]
	extraTvlsEnabled: ISettings
	volumeData?: IOverviewProps['protocols']
	feesData?: IOverviewProps['protocols']
}) => {
	const checkExtras = {
		...extraTvlsEnabled,
		doublecounted: !extraTvlsEnabled.doublecounted
	}

	const updatedProtocols = Object.values(checkExtras).every((t) => !t)
		? protocols
		: protocols.map(({ tvl, tvlPrevDay, tvlPrevWeek, tvlPrevMonth, extraTvl, mcap, name, ...props }) => {
				let finalTvl: number | null = tvl
				let finalTvlPrevDay: number | null = tvlPrevDay
				let finalTvlPrevWeek: number | null = tvlPrevWeek
				let finalTvlPrevMonth: number | null = tvlPrevMonth
				let strikeTvl = false

				// keep liquid staking in same positon in table but strike its tvl
				if (props.category === 'Liquid Staking' && !extraTvlsEnabled['liquidstaking']) {
					strikeTvl = true
				}

				if (['RWA', 'Infrastructure', 'Staking Pool'].includes(props.category)) {
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

				let change1d: number | null = getPercentChange(finalTvl, finalTvlPrevDay)
				let change7d: number | null = getPercentChange(finalTvl, finalTvlPrevWeek)
				let change1m: number | null = getPercentChange(finalTvl, finalTvlPrevMonth)

				const mcaptvl = mcap && finalTvl ? +(mcap / finalTvl).toFixed(2) : null

				const currentVolume = volumeData?.find((data) =>
					props?.parentProtocol || !data?.id ? data.name === name : false
				)

				const currentFees = feesData?.find((data) => (props?.parentProtocol || !data?.id ? data.name === name : false))

				return {
					...props,
					name,
					tvl: finalTvl,
					tvlPrevDay: finalTvlPrevDay,
					tvlPrevWeek: finalTvlPrevWeek,
					tvlPrevMonth: finalTvlPrevMonth,
					change_1d: change1d,
					change_7d: change7d,
					change_1m: change1m,
					fees_24h: currentFees?.total24h,
					revenue_24h: currentFees?.revenue24h,
					holderRevenue_24h: currentFees?.dailyHoldersRevenue,
					fees_7d: currentFees?.total7d,
					revenue_7d: currentFees?.revenue7d,
					fees_30d: currentFees?.total30d,
					fees_1y: currentFees?.total1y,
					revenue_30d: currentFees?.revenue30d,
					revenue_1y: currentFees?.revenue1y,
					average_fees_1y: currentFees?.average1y,
					average_revenue_1y: currentFees?.averageRevenue1y,
					holdersRevenue30d: currentFees?.holdersRevenue30d,
					treasuryRevenue_24h: currentFees?.dailyProtocolRevenue,
					supplySideRevenue_24h: currentFees?.dailySupplySideRevenue,
					userFees_24h: currentFees?.dailyUserFees,
					cumulativeFees: currentFees?.totalAllTime,
					pf: getAnnualizedRatio(mcap, currentFees?.total30d),
					ps: getAnnualizedRatio(mcap, currentFees?.revenue30d),
					volume_24h: currentVolume?.total24h,
					volume_7d: currentVolume?.total7d,
					volumeChange_7d: currentVolume?.['change_7dover7d'],
					cumulativeVolume: currentVolume?.totalAllTime,
					mcap,
					mcaptvl,
					strikeTvl
				}
		  })

	return parentProtocols ? groupProtocols(updatedProtocols, parentProtocols) : updatedProtocols
}
