import type { IAdapterProtocolMetrics } from '~/containers/DimensionAdapters/api.types'
import { definitions } from '~/public/definitions'
import type { IProtocolOverviewPageData } from './types'

type AdapterOverview = NonNullable<IProtocolOverviewPageData['fees']>

const commonMethodology = {
	dexs: definitions.dexs.common,
	dexAggregators: definitions.dexAggregators.common,
	perps: definitions.perps.common,
	perpsAggregators: definitions.perpsAggregators.common,
	bridgeAggregators: definitions.bridgeAggregators.common,
	optionsPremiumVolume: definitions.optionsPremium.common,
	optionsNotionalVolume: definitions.optionsNotional.common
}

export function formatAdapterData({
	data,
	methodologyKey
}: {
	data: IAdapterProtocolMetrics | null | undefined
	methodologyKey?: string
}): AdapterOverview | null {
	if (!data) {
		return null
	}

	let chainBreakdown: Record<
		string,
		{ total24h: number | null; total7d: number | null; total30d: number | null; totalAllTime: number | null }
	> | null = null
	if (data.chainBreakdown) {
		const slim: NonNullable<typeof chainBreakdown> = {}
		for (const chain in data.chainBreakdown) {
			const value = data.chainBreakdown[chain]
			slim[chain] = {
				total24h: value.total24h ?? null,
				total7d: value.total7d ?? null,
				total30d: value.total30d ?? null,
				totalAllTime: value.totalAllTime ?? null
			}
		}
		chainBreakdown = Object.keys(slim).length === 0 ? null : slim
	}

	const commonMethodologyMap = commonMethodology as Record<string, string>

	if (data.childProtocols?.length) {
		const childMethodologies: Array<[string, string | null, string | null]> = []
		for (const childProtocol of data.childProtocols) {
			if (methodologyKey && !commonMethodologyMap[methodologyKey]) {
				childMethodologies.push([
					childProtocol.displayName,
					childProtocol.methodology?.[methodologyKey] ?? null,
					childProtocol.methodologyURL ?? null
				])
			}
		}

		const areMethodologiesDifferent = new Set(childMethodologies.map((entry) => entry[1])).size > 1
		const topChildMethodology = childMethodologies.find((entry) => entry[0] === data.childProtocols?.[0]?.displayName)

		return {
			total24h: data.total24h ?? null,
			total7d: data.total7d ?? null,
			total30d: data.total30d ?? null,
			totalAllTime: data.totalAllTime ?? null,
			...(methodologyKey === 'HoldersRevenue'
				? {
						methodology: methodologyKey
							? (childMethodologies.find((entry) => entry[1] != null)?.[1] ??
								commonMethodologyMap[methodologyKey] ??
								null)
							: null,
						methodologyURL: childMethodologies.find((entry) => entry[2] != null)?.[2] ?? null
					}
				: areMethodologiesDifferent
					? { childMethodologies: childMethodologies.filter((entry) => !!(entry[1] || entry[2])) }
					: {
							methodology: methodologyKey
								? (topChildMethodology?.[1] ?? commonMethodologyMap[methodologyKey] ?? null)
								: null,
							methodologyURL: topChildMethodology?.[2] ?? null
						}),
			defaultChartView: data.defaultChartView ?? 'daily',
			chainBreakdown
		}
	}

	return {
		total24h: data.total24h ?? null,
		total7d: data.total7d ?? null,
		total30d: data.total30d ?? null,
		totalAllTime: data.totalAllTime ?? null,
		methodology: methodologyKey
			? (data.methodology?.[methodologyKey] ?? commonMethodologyMap[methodologyKey] ?? null)
			: null,
		methodologyURL: data.methodologyURL ?? null,
		defaultChartView: data.defaultChartView ?? 'daily',
		chainBreakdown
	}
}
