import { getAnnualizedRatio } from '~/api/categories/adaptors'
import { IFormattedProtocol, IParentProtocol } from '~/api/types'
import { getPercentChange } from '~/utils'

function addElement(key: string, curr: IFormattedProtocol, acc: any, hasAtleastOnceValue) {
	if (curr[key] || curr[key] === 0) {
		hasAtleastOnceValue[key] = true
		acc[key] = (acc[key] ?? 0) + curr[key]
	} else {
		if (!hasAtleastOnceValue[key]) {
			acc[key] = null
		}
	}
}

// group protocols so we can show child protocols inside an accordion in a table
const groupData = (protocols: IFormattedProtocol[], parent: IParentProtocol, noSubrows?: boolean) => {
	let strikeTvl = false
	let parentExcluded = false
	const categories = new Set()

	const hasAtleastOnceValue = {}
	const {
		mcap,
		tvl,
		tvlPrevDay,
		tvlPrevWeek,
		tvlPrevMonth,
		volume_24h,
		volume_7d,
		cumulativeVolume,
		fees_7d,
		fees_24h,
		fees_30d,
		revenue_24h,
		revenue_7d,
		revenue_30d,
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

			curr.tvl && (acc.tvl = (acc.tvl || 0) + curr.tvl)

			if (curr?.extraTvl?.excludeParent) {
				["tvl", "tvlPrevDay", "tvlPrevWeek", "tvlPrevMonth"].forEach(key => {
					if (curr.extraTvl.excludeParent[key]) {
						acc[key] -= curr.extraTvl.excludeParent[key]
					}
				})
			}
			;[
				'tvlPrevDay',
				'tvlPrevWeek',
				'tvlPrevMonth',
				'volume_24h',
				'volume_7d',
				'cumulativeVolume',
				'fees_7d',
				'fees_24h',
				'fees_30d',
				'revenue_24h',
				'revenue_7d',
				'revenue_30d',
				'holderRevenue_24h',
				'holdersRevenue30d',
				'userFees_24h',
				'cumulativeFees',
				'treasuryRevenue_24h',
				'supplySideRevenue_24h'
			].forEach((k) => addElement(k, curr, acc, hasAtleastOnceValue))

			if (curr.mcap) {
				acc.mcap = acc.mcap + curr.mcap
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
			fees_7d: 0,
			fees_24h: 0,
			fees_30d: 0,
			revenue_24h: 0,
			revenue_7d: 0,
			revenue_30d: 0,
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
	const pf = getAnnualizedRatio(mcap, fees_30d)
	const ps = getAnnualizedRatio(mcap, revenue_30d)

	let mcaptvl = null

	if (tvl) {
		if (mcap) {
			mcaptvl = +(mcap / tvl).toFixed(2)
		}
		if (parent.mcap) {
			mcaptvl = +(parent.mcap / tvl).toFixed(2)
		}
	}

	return {
		name: parent.name,
		logo: parent.logo,
		url: parent.url,
		chains: parent.chains,
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
		revenue_24h,
		revenue_7d,
		revenue_30d,
		holderRevenue_24h,
		holdersRevenue30d,
		userFees_24h,
		cumulativeFees,
		treasuryRevenue_24h,
		supplySideRevenue_24h,
		volume_24h,
		volume_7d,
		cumulativeVolume,
		pf,
		ps,
		mcap,
		mcaptvl,
		extraTvl: {},
		symbol: null,
		category: categories.size > 1 ? null : Array.from(categories).join(', '),
		subRows: noSubrows ? null : [...protocols],
		chainTvls: {}, // TODO cleanup
		strikeTvl,
		parentExcluded,
		isParentProtocol: true
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
