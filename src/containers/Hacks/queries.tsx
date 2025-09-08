import { ILineAndBarChartProps } from '~/components/ECharts/types'
import { HACKS_API } from '~/constants'
import { CHART_COLORS } from '~/constants/colors'
import { firstDayOfMonth, formattedNum, preparePieChartData, slug } from '~/utils'
import { fetchJson } from '~/utils/async'

export interface IHack {
	date: number
	name: string
	classification: string
	technique: string
	amount: number
	chain?: Array<string>
	bridgeHack: boolean
	targetType: string
	source: string
	returnedFunds: number | null
	defillamaId: number
	parentProtocolId: string
	language: string | null
}

export interface IHacksPageData {
	data: Array<{
		chains: string[]
		classification: string
		date: number
		target: string
		amount: number
		name: string
		technique: string
		bridge: boolean
		link: string
		language: string
	}>
	monthlyHacksChartData: ILineAndBarChartProps['charts']
	totalHacked: string
	totalHackedDefi: string
	totalRugs: string
	pieChartData: Array<{ name: string; value: number }>
}

export async function getHacksPageData(): Promise<IHacksPageData> {
	const data = (await fetchJson(HACKS_API)).map((h: IHack) => ({
		chains: h.chain ?? [],
		classification: h.classification,
		date: h.date,
		target: h.targetType,
		amount: h.amount,
		name: h.name,
		technique: h.technique,
		bridge: h.bridgeHack,
		link: h.source ?? '',
		language: h.language ?? ''
	}))

	const monthlyHacks = {}

	data.forEach((hack) => {
		const monthlyDate = +firstDayOfMonth(hack.date * 1000) * 1e3
		monthlyHacks[monthlyDate] = (monthlyHacks[monthlyDate] ?? 0) + hack.amount
	})

	const totalHacked = formattedNum(
		data.map((hack) => hack.amount).reduce((acc, amount) => acc + amount, 0) / 1000,
		true
	)

	const totalHackedDefi = formattedNum(
		data
			.filter((hack) => hack.target == 'DeFi Protocol')
			.map((hack) => hack.amount)
			.reduce((acc, amount) => acc + amount, 0) / 1000,
		true
	)

	const totalRugs = formattedNum(
		data
			.filter((hack) => hack.bridge === true)
			.map((hack) => hack.amount)
			.reduce((acc, amount) => acc + amount, 0) / 1000,
		true
	)

	const onlyHacksTechnique = data.map((hack) => ({
		name: hack.technique,
		value: hack.amount
	}))

	const sumDuplicates = (acc, obj) => {
		const found = acc.find((o) => o.name === obj.name)
		if (found) {
			found.value += obj.value
		} else {
			acc.push({ ...obj, value: obj.value })
		}
		return acc
	}

	const groupedHacks = onlyHacksTechnique.reduce(sumDuplicates, [])

	const pieChartData = preparePieChartData({ data: groupedHacks, limit: 15 })
	const monthlyHacksChartData = []
	for (const date in monthlyHacks) {
		monthlyHacksChartData.push([+date, monthlyHacks[date]])
	}

	return {
		data,
		monthlyHacksChartData: {
			'Total Value Hacked': {
				name: 'Total Value Hacked',
				stack: 'Total Value Hacked',
				type: 'bar',
				data: monthlyHacksChartData,
				color: CHART_COLORS[0]
			}
		},
		totalHacked,
		totalHackedDefi,
		totalRugs,
		pieChartData
	}
}

export interface IProtocolTotalValueLostInHacksByProtocol {
	protocols: Array<{ name: string; slug: string; route: string; totalHacked: number; returnedFunds: number }>
}

export async function getTotalValueLostInHacksByProtocol(): Promise<IProtocolTotalValueLostInHacksByProtocol> {
	try {
		const data = await fetchJson(HACKS_API)
		const protocols: Array<IHack> = data.filter((h: IHack) => h.defillamaId)
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)

		const totalLostByProtocol = protocols.reduce((acc, hack) => {
			const protocol = metadataCache.protocolMetadata[hack.defillamaId]
			if (protocol) {
				const name = protocol.displayName || hack.name
				if (!acc[name]) {
					acc[name] = {
						name,
						slug: slug(name),
						route: hack.targetType === 'CEX' ? `/cex/${slug(name)}` : `/protocol/${slug(name)}`,
						totalHacked: 0,
						returnedFunds: 0
					}
				}
				acc[name].totalHacked += hack.amount ?? 0
				acc[name].returnedFunds += hack.returnedFunds ?? 0
			}
			return acc
		}, {})

		const finalProtocls = []
		for (const protocol in totalLostByProtocol) {
			finalProtocls.push(totalLostByProtocol[protocol])
		}
		return { protocols: finalProtocls.sort((a, b) => b.totalHacked - a.totalHacked) }
	} catch (error) {
		console.error(error)
	}
}
