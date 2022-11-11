import { IFormattedProtocol, IParentProtocol } from '~/api/types'
import { getPercentChange } from '~/utils'

// group protocols so we can show child protocols inside an accordion in a table
export const groupData = (protocols: IFormattedProtocol[], parent: IParentProtocol) => {
	const { mcap, tvl, tvlPrevDay, tvlPrevWeek, tvlPrevMonth } = protocols.reduce(
		(acc, curr) => {
			if (!curr.strikeTvl) {
				curr.tvl && (acc.tvl = (acc.tvl || 0) + curr.tvl)
				curr.tvlPrevDay && (acc.tvlPrevDay = (acc.tvlPrevDay || 0) + curr.tvlPrevDay)
				curr.tvlPrevWeek && (acc.tvlPrevWeek = (acc.tvlPrevWeek || 0) + curr.tvlPrevWeek)
				curr.tvlPrevMonth && (acc.tvlPrevMonth = (acc.tvlPrevMonth || 0) + curr.tvlPrevMonth)

				if (curr.mcap) {
					acc.mcap = (acc.mcap || 0) + curr.mcap
				} else acc.mcap = null
			}

			return acc
		},
		{
			mcap: null,
			tvl: null,
			tvlPrevDay: null,
			tvlPrevWeek: null,
			tvlPrevMonth: null
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
		mcap,
		mcaptvl,
		extraTvl: {},
		symbol: undefined,
		category: undefined,
		subRows: [...protocols],
		chainTvls: {} // TODO cleanup
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
