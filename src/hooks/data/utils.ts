import { IFormattedProtocol, IParentProtocol } from '~/api/types'
import { getPercentChange } from '~/utils'

function addElement(key: string, curr: IFormattedProtocol, acc: any) {
	if (curr[key] && acc[key] !== null) {
		acc[key] += curr[key]
	} else {
		acc[key] = null
	}
}

// group protocols so we can show child protocols inside an accordion in a table
export const groupData = (protocols: IFormattedProtocol[], parent: IParentProtocol) => {
	let strikeTvl = false
	let category = protocols[0].category
	const { mcap, tvl, tvlPrevDay, tvlPrevWeek, tvlPrevMonth, volume_7d, fees_7d, revenue_7d } = protocols.reduce(
		(acc, curr) => {
			if (curr.strikeTvl) {
				strikeTvl = true
			}
			curr.tvl && (acc.tvl = (acc.tvl || 0) + curr.tvl);
			["tvlPrevDay", "tvlPrevWeek", "tvlPrevMonth", "volume_7d", "fees_7d", "revenue_7d"].forEach(k => addElement(k, curr, acc))

			if (curr.category !== category) {
				category = undefined;
			}
			if (curr.mcap) {
				acc.mcap = (acc.mcap || 0) + curr.mcap
			} else acc.mcap = null

			return acc
		},
		{
			mcap: 0,
			tvl: 0,
			tvlPrevDay: 0,
			tvlPrevWeek: 0,
			tvlPrevMonth: 0,
			volume_7d: 0,
			fees_7d: 0,
			revenue_7d: 0
		}
	)

	const change1d: number | null = getPercentChange(tvl, tvlPrevDay)
	const change7d: number | null = getPercentChange(tvl, tvlPrevWeek)
	const change1m: number | null = getPercentChange(tvl, tvlPrevMonth)

	const mcaptvl = mcap && tvl ? mcap / tvl : null

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
		fees_7d,
		revenue_7d,
		volume_7d,
		mcap,
		mcaptvl,
		extraTvl: {},
		symbol: undefined,
		category,
		subRows: [...protocols],
		chainTvls: {}, // TODO cleanup
		strikeTvl,
		isParentProtocol: true,
	}
}

export const groupProtocols = (
	protocols: Readonly<IFormattedProtocol[]>,
	parentProtocols: Readonly<IParentProtocol[]>
) => {
	let data = [...protocols]

	parentProtocols.forEach((item) => {
		const list = protocols.filter((p) => p.parentProtocol === item.id)

		if (list.length >= 2) {
			data = data.filter((p) => p.parentProtocol !== item.id)
			data.push(groupData(list, item))
		}
	})

	return data.sort((a, b) => b.tvl - a.tvl)
}
