import { getAnnualizedRatio } from '~/api/categories/adaptors'
import { IFormattedProtocol, IParentProtocol } from '~/api/types'
import { getPercentChange } from '~/utils'

function addElement(key: string, curr: IFormattedProtocol, acc: any, hasAtleastOnceValue) {
	if (curr[key] || curr[key] === 0) {
		hasAtleastOnceValue[key] = true
		acc[key] = (acc[key] ?? 0) + curr[key]
	} else {
		if (!hasAtleastOnceValue[key]) {
			acc[key] = undefined
		}
	}
}

// group protocols so we can show child protocols inside an accordion in a table
const groupData = (protocols: IFormattedProtocol[], parent: IParentProtocol, noSubrows?: boolean) => {
	let strikeTvl = false
	let parentExcluded = false
	const categories = new Set()

	const hasAtleastOnceValue = {}
	let weightedVolumeChange = 0
	let totalVolumeWeight = 0
	let weightedPerpsVolumeChange = 0
	let totalPerpsVolumeWeight = 0

	const {
		mcap,
		tvl,
		tvlPrevDay,
		tvlPrevWeek,
		tvlPrevMonth,
		volume_24h,
		volume_7d,
		cumulativeVolume,
		perps_volume_24h,
		perps_volume_7d,
		perps_volume_30d,
		openInterest,
		fees_7d,
		fees_24h,
		fees_30d,
		fees_1y,
		revenue_24h,
		revenue_7d,
		revenue_30d,
		revenue_1y,
		holderRevenue_24h,
		holdersRevenue30d,
		userFees_24h,
		cumulativeFees,
		treasuryRevenue_24h,
		supplySideRevenue_24h
	} = protocols.reduce(
		(acc, curr) => {
			if (curr.strikeTvl) {
				strikeTvl = true
			}
			if (curr.extraTvl?.excludeParent) {
				parentExcluded = true
			}

			if (curr.category) {
				categories.add(curr.category)
			}

			if (curr.tvl) {
				acc.tvl = (acc.tvl || 0) + curr.tvl
			}

			if (curr?.extraTvl?.excludeParent) {
				;['tvl', 'tvlPrevDay', 'tvlPrevWeek', 'tvlPrevMonth'].forEach((key) => {
					if (curr.extraTvl.excludeParent[key]) {
						acc[key] -= curr.extraTvl.excludeParent[key]
					}
				})
			}
			for (const key of [
				'tvlPrevDay',
				'tvlPrevWeek',
				'tvlPrevMonth',
				'volume_24h',
				'volume_7d',
				'cumulativeVolume',
				'perps_volume_24h',
				'perps_volume_7d',
				'perps_volume_30d',
				'openInterest',
				'fees_7d',
				'fees_24h',
				'fees_30d',
				'fees_1y',
				'revenue_24h',
				'revenue_7d',
				'revenue_30d',
				'revenue_1y',
				'holderRevenue_24h',
				'holdersRevenue30d',
				'userFees_24h',
				'cumulativeFees',
				'treasuryRevenue_24h',
				'supplySideRevenue_24h'
			]) {
				addElement(key, curr, acc, hasAtleastOnceValue)
			}

			if (curr.mcap) {
				acc.mcap = acc.mcap + curr.mcap
			}

			if (curr.volume_7d && curr.volumeChange_7d !== undefined && curr.volumeChange_7d !== null) {
				weightedVolumeChange += curr.volumeChange_7d * curr.volume_7d
				totalVolumeWeight += curr.volume_7d
			}

			if (curr.perps_volume_7d && curr.perps_volume_change_7d !== undefined && curr.perps_volume_change_7d !== null) {
				weightedPerpsVolumeChange += curr.perps_volume_change_7d * curr.perps_volume_7d
				totalPerpsVolumeWeight += curr.perps_volume_7d
			}

			return acc
		},
		{
			mcap: 0,
			tvl: 0,
			tvlPrevDay: 0,
			tvlPrevWeek: 0,
			tvlPrevMonth: 0,
			volume_24h: 0,
			volume_7d: 0,
			cumulativeVolume: 0,
			perps_volume_24h: 0,
			perps_volume_7d: 0,
			perps_volume_30d: 0,
			openInterest: 0,
			fees_7d: 0,
			fees_24h: 0,
			fees_30d: 0,
			fees_1y: 0,
			revenue_24h: 0,
			revenue_7d: 0,
			revenue_30d: 0,
			revenue_1y: 0,
			holderRevenue_24h: 0,
			holdersRevenue30d: 0,
			userFees_24h: 0,
			cumulativeFees: 0,
			treasuryRevenue_24h: 0,
			supplySideRevenue_24h: 0
		}
	)

	const change1d: number | null = getPercentChange(tvl, tvlPrevDay)
	const change7d: number | null = getPercentChange(tvl, tvlPrevWeek)
	const change1m: number | null = getPercentChange(tvl, tvlPrevMonth)

	let volumeChange_7d = null
	if (totalVolumeWeight > 0) {
		volumeChange_7d = weightedVolumeChange / totalVolumeWeight
	}

	let perps_volume_change_7d = null
	if (totalPerpsVolumeWeight > 0) {
		perps_volume_change_7d = weightedPerpsVolumeChange / totalPerpsVolumeWeight
	}

	const finalMcap = mcap > 0 ? mcap : parent?.mcap || 0
	const pf = getAnnualizedRatio(finalMcap, fees_30d)
	const ps = getAnnualizedRatio(finalMcap, revenue_30d)

	let mcaptvl = null
	if (tvl && finalMcap) {
		mcaptvl = +(finalMcap / tvl).toFixed(2)
	}

	const oracleSet = new Set<string>()
	const oraclesByChainAgg: Record<string, Set<string>> = {}
	const addOracles = (obj: any) => {
		if (Array.isArray(obj?.oracles)) obj.oracles.forEach((o: string) => oracleSet.add(o))
		if (obj?.oraclesByChain) {
			for (const k of Object.keys(obj.oraclesByChain as Record<string, string[]>)) {
				const set = (oraclesByChainAgg[k] = oraclesByChainAgg[k] || new Set<string>())
				;(obj.oraclesByChain[k] || []).forEach((o: string) => set.add(o))
			}
		}
	}
	addOracles(parent)
	protocols.forEach(addOracles)
	const aggregatedOraclesByChain = Object.fromEntries(
		Object.entries(oraclesByChainAgg).map(([k, v]) => [k, Array.from(v).sort((a, b) => a.localeCompare(b))])
	)

	return {
		name: parent.name,
		logo: parent.logo,
		url: parent.url,
		chains: parent.chains,
		defillamaId: parent.id,
		tvl,
		tvlPrevDay,
		tvlPrevWeek,
		tvlPrevMonth,
		change_1d: change1d,
		change_7d: change7d,
		change_1m: change1m,
		fees_24h,
		fees_7d,
		fees_30d,
		fees_1y,
		revenue_24h,
		revenue_7d,
		revenue_30d,
		revenue_1y,
		holderRevenue_24h,
		holdersRevenue30d,
		userFees_24h,
		cumulativeFees,
		treasuryRevenue_24h,
		supplySideRevenue_24h,
		volume_24h,
		volume_7d,
		volumeChange_7d,
		cumulativeVolume,
		perps_volume_24h,
		perps_volume_7d,
		perps_volume_30d,
		perps_volume_change_7d,
		openInterest,
		pf,
		ps,
		mcap: finalMcap,
		mcaptvl: mcaptvl ?? undefined,
		extraTvl: {},
		symbol: null,
		category: categories.size > 1 ? null : Array.from(categories).join(', '),
		subRows: noSubrows ? null : [...protocols],
		chainTvls: {}, // TODO cleanup
		strikeTvl,
		parentExcluded,
		isParentProtocol: true,
		oracles: Array.from(oracleSet).sort((a, b) => a.localeCompare(b)),
		oraclesByChain: aggregatedOraclesByChain
	}
}

export const groupProtocols = (
	protocols: Readonly<IFormattedProtocol[]>,
	parentProtocols: Readonly<IParentProtocol[]>,
	noSubrows?: boolean
) => {
	let data = [...protocols]

	parentProtocols.forEach((item) => {
		const list = protocols.filter((p) => p.parentProtocol === item.id)

		if (list.length >= 2) {
			if (!noSubrows) {
				data = data.filter((p) => p.parentProtocol !== item.id)
			}

			data.push(groupData(list, item, noSubrows))
		}
	})

	return data.sort((a, b) => b.tvl - a.tvl)
}
