import { preparePieChartData } from '~/components/ECharts/formatters'
import { CHART_COLORS } from '~/constants/colors'
import { firstDayOfMonth, formattedNum, slug } from '~/utils'
import type { IProtocolMetadata } from '~/utils/metadata/types'
import { fetchHacks } from './api'
import type { IHackApiItem } from './api.types'
import type { IHacksPageData, IProtocolTotalValueLostInHacksByProtocol } from './types'

export async function getHacksPageData(): Promise<IHacksPageData> {
	const rawHacks = await fetchHacks()

	const data = rawHacks.map((h) => ({
		chains: h.chain ?? [],
		classification: h.classification ?? '',
		date: h.date,
		target: h.targetType,
		amount: h.amount ?? 0,
		name: h.name,
		technique: h.technique ?? '',
		bridge: h.bridgeHack,
		link: h.source ?? '',
		language: h.language ?? ''
	}))

	const monthlyHacks = new Map<number, number>()
	const chainTotals = new Map<string, number>()
	const techniqueTotals = new Map<string, number>()
	const classificationTotals = new Map<string, number>()
	let totalHackedRaw = 0
	let totalHackedDefiRaw = 0
	let totalRugsRaw = 0

	const addToTotal = (m: Map<string, number>, key: string, amount: number): void => {
		if (!key) return
		m.set(key, (m.get(key) ?? 0) + amount)
	}

	for (const hack of data) {
		const monthlyDate = firstDayOfMonth(hack.date) * 1e3
		monthlyHacks.set(monthlyDate, (monthlyHacks.get(monthlyDate) ?? 0) + hack.amount)

		totalHackedRaw += hack.amount
		if (hack.target === 'DeFi Protocol') totalHackedDefiRaw += hack.amount
		if (hack.bridge) totalRugsRaw += hack.amount

		addToTotal(techniqueTotals, hack.technique, hack.amount)
		addToTotal(classificationTotals, hack.classification, hack.amount)
		for (const c of hack.chains) addToTotal(chainTotals, c, hack.amount)
	}

	const totalHacked = formattedNum(totalHackedRaw, true)
	const totalHackedDefi = formattedNum(totalHackedDefiRaw, true)
	const totalRugs = formattedNum(totalRugsRaw, true)

	const pieChartData = preparePieChartData({
		data: Array.from(techniqueTotals.entries()).map(([name, value]) => ({ name, value })),
		limit: 15
	})

	const monthlyHacksChartData = Array.from(monthlyHacks.entries()).sort((a, b) => a[0] - b[0])

	const byTotalDescThenNameAsc = (a: [string, number], b: [string, number]): number =>
		b[1] - a[1] || a[0].localeCompare(b[0])

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

type ProtocolHackRow = IProtocolTotalValueLostInHacksByProtocol['protocols'][number]

export async function getTotalValueLostInHacksByProtocol({
	protocolMetadata
}: {
	protocolMetadata: Record<string, IProtocolMetadata>
}): Promise<IProtocolTotalValueLostInHacksByProtocol> {
	try {
		const rawHacks = await fetchHacks()
		const protocols = rawHacks.filter((h): h is IHackApiItem & { defillamaId: number } => h.defillamaId != null)

		const totalLostByProtocol = new Map<string, ProtocolHackRow>()

		for (const hack of protocols) {
			const protocol = protocolMetadata[hack.defillamaId]
			if (protocol) {
				const name = protocol.displayName ?? hack.name
				const existing = totalLostByProtocol.get(name)
				if (existing) {
					existing.totalHacked += hack.amount ?? 0
					existing.returnedFunds += hack.returnedFunds ?? 0
				} else {
					totalLostByProtocol.set(name, {
						name,
						slug: slug(name),
						route: hack.targetType === 'CEX' ? `/cex/${slug(name)}` : `/protocol/${slug(name)}`,
						totalHacked: hack.amount ?? 0,
						returnedFunds: hack.returnedFunds ?? 0
					})
				}
			}
		}

		const result = Array.from(totalLostByProtocol.values()).sort((a, b) => b.totalHacked - a.totalHacked)
		return { protocols: result }
	} catch (error) {
		console.log(error)
		return { protocols: [] }
	}
}
