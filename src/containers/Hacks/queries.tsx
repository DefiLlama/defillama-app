import { preparePieChartData } from '~/components/ECharts/formatters'
import type { IMultiSeriesChart2Props, MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { HACKS_API } from '~/constants'
import { CHART_COLORS } from '~/constants/colors'
import { firstDayOfMonth, formattedNum, slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { IProtocolMetadata } from '~/utils/metadata/types'

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
	monthlyHacksChartData: { dataset: MultiSeriesChart2Dataset; charts: IMultiSeriesChart2Props['charts'] }
	totalHacked: string
	totalHackedDefi: string
	totalRugs: string
	pieChartData: Array<{ name: string; value: number }>
	chainOptions: string[]
	techniqueOptions: string[]
	classificationOptions: string[]
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

	const monthlyHacks: Record<number, number> = {}
	const chainTotals = new Map<string, number>()
	const techniqueTotals = new Map<string, number>()
	const classificationTotals = new Map<string, number>()
	let totalHackedRaw = 0
	let totalHackedDefiRaw = 0
	let totalRugsRaw = 0

	const addToTotal = (m: Map<string, number>, key: string | null | undefined, amount: number) => {
		if (!key) return
		m.set(key, (m.get(key) ?? 0) + amount)
	}

	for (const hack of data) {
		const monthlyDate = firstDayOfMonth(hack.date) * 1e3
		monthlyHacks[monthlyDate] = (monthlyHacks[monthlyDate] ?? 0) + hack.amount

		totalHackedRaw += hack.amount
		if (hack.target === 'DeFi Protocol') totalHackedDefiRaw += hack.amount
		if (hack.bridge === true) totalRugsRaw += hack.amount

		addToTotal(techniqueTotals, hack.technique, hack.amount)
		addToTotal(classificationTotals, hack.classification, hack.amount)
		for (const c of hack.chains || []) addToTotal(chainTotals, c, hack.amount)
	}

	const totalHacked = formattedNum(totalHackedRaw, true)
	const totalHackedDefi = formattedNum(totalHackedDefiRaw, true)
	const totalRugs = formattedNum(totalRugsRaw, true)

	const pieChartData = preparePieChartData({
		data: Array.from(techniqueTotals.entries()).map(([name, value]) => ({ name, value })),
		limit: 15
	})
	const monthlyHacksChartData = []
	for (const date in monthlyHacks) {
		monthlyHacksChartData.push([+date, monthlyHacks[date]])
	}

	const byTotalDescThenNameAsc = (a: [string, number], b: [string, number]) => b[1] - a[1] || a[0].localeCompare(b[0])

	const chainOptions = Array.from(chainTotals.entries())
		.sort(byTotalDescThenNameAsc)
		.map(([name]) => name)

	const techniqueOptions = Array.from(techniqueTotals.entries())
		.sort(byTotalDescThenNameAsc)
		.map(([name]) => name)

	const classificationOptions = Array.from(classificationTotals.entries())
		.sort(byTotalDescThenNameAsc)
		.map(([name]) => name)

	return {
		data,
		monthlyHacksChartData: {
			dataset: {
				source: monthlyHacksChartData.map(([timestamp, value]) => ({ timestamp, 'Total Value Hacked': value })),
				dimensions: ['timestamp', 'Total Value Hacked']
			},
			charts: [
				{
					type: 'bar' as const,
					name: 'Total Value Hacked',
					encode: { x: 'timestamp', y: 'Total Value Hacked' },
					color: CHART_COLORS[0],
					stack: 'Total Value Hacked'
				}
			]
		},
		totalHacked,
		totalHackedDefi,
		totalRugs,
		pieChartData,
		chainOptions,
		techniqueOptions,
		classificationOptions
	}
}

export interface IProtocolTotalValueLostInHacksByProtocol {
	protocols: Array<{ name: string; slug: string; route: string; totalHacked: number; returnedFunds: number }>
}

export async function getTotalValueLostInHacksByProtocol({
	protocolMetadata
}: {
	protocolMetadata: Record<string, IProtocolMetadata>
}): Promise<IProtocolTotalValueLostInHacksByProtocol> {
	try {
		const data = await fetchJson(HACKS_API)
		const protocols: Array<IHack> = data.filter((h: IHack) => h.defillamaId)

		const totalLostByProtocol = protocols.reduce((acc, hack) => {
			const protocol = protocolMetadata[hack.defillamaId]
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
		console.log(error)
	}
}
