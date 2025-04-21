import { IOverviewProps } from '~/api/categories/adaptors'
import { IFormattedProtocol, IParentProtocol, TCompressedChain } from '~/api/types'
import { removedCategories } from '~/constants'
import { ISettings } from '~/contexts/types'
import { getDominancePercent, getPercentChange } from '~/utils'
import { groupProtocols } from './utils'
import { IChainAssets, IProtocol } from '~/containers/ChainOverview/types'

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
	chainAssets?: IChainAssets
}

export interface IFormattedDataWithExtraTvl {
	chainAssets?: IChainAssets | null
	tvl: number
	tvlPrevDay: number
	tvlPrevWeek: number
	tvlPrevMonth: number
	change_1d: number | null
	change_7d: number | null
	change_1m: number | null
	mcap: number | null
	mcaptvl: number | null
	name: string
	subRows?: Array<{
		chainAssets?: IChainAssets | null
		tvl: number
		tvlPrevDay: number
		tvlPrevWeek: number
		tvlPrevMonth: number
		change_1d: number | null
		change_7d: number | null
		change_1m: number | null
		mcap: number | null
		mcaptvl: number | null
		name: string
	}>
}

export function formatDataWithExtraTvls({
	data,
	defaultSortingColumn,
	dir,
	applyLqAndDc,
	extraTvlsEnabled,
	chainAssets
}: IFormattedDataWithExtraTvlProps): Array<IFormattedDataWithExtraTvl> {
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

		if (chainAssets && props.name && chainAssets[props.name]) {
			let total = chainAssets[props.name].total?.total.split('.')[0] ?? null
			const ownTokens = chainAssets[props.name].ownTokens?.total.split('.')[0] ?? null
			const canonical = chainAssets[props.name].canonical?.total.split('.')[0] ?? null
			const native = chainAssets[props.name].native?.total.split('.')[0] ?? null
			const thirdParty = chainAssets[props.name].thirdParty?.total.split('.')[0] ?? null

			assets = {
				total: extraTvlsEnabled.govtokens && ownTokens ? +(total ?? 0) + +ownTokens : total,
				ownTokens: ownTokens == '0' ? null : ownTokens,
				canonical: canonical == '0' ? null : canonical,
				native: native == '0' ? null : native,
				thirdParty: thirdParty == '0' ? null : thirdParty
			}
		}

		return {
			...props,
			chainAssets: assets,
			tvl: finalTvl < 0 ? 0 : finalTvl,
			tvlPrevDay: finalTvlPrevDay < 0 ? 0 : finalTvlPrevDay,
			tvlPrevWeek: finalTvlPrevWeek < 0 ? 0 : finalTvlPrevWeek,
			tvlPrevMonth: finalTvlPrevMonth < 0 ? 0 : finalTvlPrevMonth,
			change_1d: change1d,
			change_7d: change7d,
			change_1m: change1m,
			mcap,
			mcaptvl: mcaptvl ?? undefined
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
}): IFormattedProtocol[] => {
	const checkExtras = {
		...extraTvlsEnabled,
		doublecounted: !extraTvlsEnabled.doublecounted
	}

	const allProtocols: Record<string, IFormattedProtocol> = {}

	const shouldModifyTvl = Object.values(checkExtras).some((t) => t)

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

		allProtocols[name?.toLowerCase()] = {
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
			mcaptvl: mcaptvl ?? undefined,
			strikeTvl
		}
	}

	for (const protocol of feesData ?? []) {
		const protocolName = protocol.name?.toLowerCase()
		if (!allProtocols[protocolName]) {
			allProtocols[protocolName] = { name: protocol.displayName } as IFormattedProtocol
		}
		allProtocols[protocolName] = {
			...allProtocols[protocolName],
			chains: Array.from(new Set([...(allProtocols[protocolName].chains ?? []), ...(protocol.chains ?? [])])),
			fees_24h: protocol.total24h ?? undefined,
			revenue_24h: protocol.revenue24h ?? undefined,
			fees_7d: protocol.total7d ?? undefined,
			revenue_7d: protocol.revenue7d ?? undefined,
			fees_30d: protocol.total30d ?? undefined,
			fees_1y: protocol.total1y ?? undefined,
			revenue_30d: protocol.revenue30d ?? undefined,
			revenue_1y: protocol.revenue1y ?? undefined,
			average_1y: protocol.average1y ?? undefined,
			average_revenue_1y: protocol.averageRevenue1y || undefined,
			holdersRevenue30d: protocol.holdersRevenue30d || undefined,
			holderRevenue_24h: protocol.holdersRevenue24h || undefined,
			treasuryRevenue_24h: protocol.dailyProtocolRevenue || undefined,
			supplySideRevenue_24h: protocol.dailySupplySideRevenue || undefined,
			userFees_24h: protocol.dailyUserFees || undefined,
			cumulativeFees: protocol.totalAllTime || undefined
		}
	}

	for (const protocol of volumeData ?? []) {
		const protocolName = protocol.name?.toLowerCase()
		if (!allProtocols[protocolName]) {
			allProtocols[protocolName] = { name: protocol.displayName } as IFormattedProtocol
		}
		allProtocols[protocolName] = {
			...allProtocols[protocolName],
			chains: Array.from(new Set([...(allProtocols[protocolName].chains ?? []), ...(protocol.chains ?? [])])),
			volume_24h: protocol.total24h,
			volume_7d: protocol.total7d,
			volumeChange_7d: protocol['change_7dover7d'],
			cumulativeVolume: protocol.totalAllTime
		}
	}

	const finalProtocols = Object.values(allProtocols)

	return (
		parentProtocols ? groupProtocols(finalProtocols, parentProtocols, noSubrows) : finalProtocols
	) as Array<IFormattedProtocol>
}

export const formatProtocolsList2 = ({
	protocols,
	extraTvlsEnabled
}: {
	protocols: IProtocol[]
	extraTvlsEnabled: ISettings
}): IProtocol[] => {
	const shouldModifyTvl = Object.values(extraTvlsEnabled).some((t) => t)

	if (!shouldModifyTvl) return protocols

	const final = []
	for (const protocol of protocols) {
		if (!protocol.tvl) {
			final.push({ ...protocol })
		} else {
			let strikeTvl = protocol.strikeTvl ?? false

			let defaultTvl = { ...(protocol.tvl?.default ?? ({} as any)) }

			if (strikeTvl && (extraTvlsEnabled['liquidstaking'] || extraTvlsEnabled['doublecounted'])) {
				strikeTvl = false
			}
			for (const tvlKey in protocol.tvl) {
				// if tvlKey is doublecounted or liquidstaking just strike tvl but do not add them
				if (extraTvlsEnabled[tvlKey] && tvlKey !== 'doublecounted' && tvlKey !== 'liquidstaking') {
					defaultTvl.tvl = (defaultTvl.tvl || 0) + protocol.tvl[tvlKey].tvl
					defaultTvl.tvlPrevDay = (defaultTvl.tvlPrevDay || 0) + protocol.tvl[tvlKey].tvlPrevDay
					defaultTvl.tvlPrevWeek = (defaultTvl.tvlPrevWeek || 0) + protocol.tvl[tvlKey].tvlPrevWeek
					defaultTvl.tvlPrevMonth = (defaultTvl.tvlPrevMonth || 0) + protocol.tvl[tvlKey].tvlPrevMonth
				}
			}

			const tvlChange = {
				change1d: getPercentChange(defaultTvl.tvl, defaultTvl.tvlPrevDay),
				change7d: getPercentChange(defaultTvl.tvl, defaultTvl.tvlPrevWeek),
				change1m: getPercentChange(defaultTvl.tvl, defaultTvl.tvlPrevMonth)
			}

			const mcaptvl = protocol.mcap != null ? +(protocol.mcap / defaultTvl.tvl).toFixed(2) : null

			if (protocol.childProtocols) {
				const childProtocols = []
				for (const child of protocol.childProtocols) {
					let strikeTvl = child.strikeTvl ?? false

					let defaultTvl = { ...(child.tvl?.default ?? ({} as any)) }

					if (strikeTvl && (extraTvlsEnabled['liquidstaking'] || extraTvlsEnabled['doublecounted'])) {
						strikeTvl = false
					}
					for (const tvlKey in child.tvl) {
						// if tvlKey is doublecounted or liquidstaking just strike tvl but do not add them
						if (extraTvlsEnabled[tvlKey] && tvlKey !== 'doublecounted' && tvlKey !== 'liquidstaking') {
							defaultTvl.tvl = (defaultTvl.tvl || 0) + child.tvl[tvlKey].tvl
							defaultTvl.tvlPrevDay = (defaultTvl.tvlPrevDay || 0) + child.tvl[tvlKey].tvlPrevDay
							defaultTvl.tvlPrevWeek = (defaultTvl.tvlPrevWeek || 0) + child.tvl[tvlKey].tvlPrevWeek
							defaultTvl.tvlPrevMonth = (defaultTvl.tvlPrevMonth || 0) + child.tvl[tvlKey].tvlPrevMonth
						}
					}
					const tvlChange = {
						change1d: getPercentChange(defaultTvl.tvl, defaultTvl.tvlPrevDay),
						change7d: getPercentChange(defaultTvl.tvl, defaultTvl.tvlPrevWeek),
						change1m: getPercentChange(defaultTvl.tvl, defaultTvl.tvlPrevMonth)
					}

					const mcaptvl = child.mcap != null ? +(child.mcap / defaultTvl.tvl).toFixed(2) : null

					childProtocols.push({ ...child, strikeTvl, tvl: { default: defaultTvl }, tvlChange, mcaptvl })
				}
				final.push({ ...protocol, strikeTvl, tvl: { default: defaultTvl }, childProtocols, tvlChange, mcaptvl })
			} else {
				final.push({ ...protocol, strikeTvl, tvl: { default: defaultTvl }, tvlChange, mcaptvl })
			}
		}
	}

	return final
}
