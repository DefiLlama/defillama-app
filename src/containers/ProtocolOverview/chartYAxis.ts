import { formatTooltipValue } from '~/components/ECharts/formatters'
import { formattedNum } from '~/utils'
import type { ProtocolChartsLabels } from './constants'

type AxisExtent = {
	min?: number
}

type AxisBuilderContext = {
	chartColors: Record<string, string>
	chartsInSeries: Set<string>
	unlockTokenSymbol: string
	gasUsedValueSymbol: string
}

type AxisConfig = {
	formatter?: (value: number, context: AxisBuilderContext) => string
	resolveColor?: (context: AxisBuilderContext) => string
}

const CUSTOM_OFFSETS: Record<string, number> = {
	Contributors: 60,
	'Contributors Commits': 80,
	'Devs Commits': 70,
	'NFT Volume': 65
}

const DASHED_AXIS_LINE_STYLE = {
	type: [5, 10],
	dashOffset: 5
} as const

function getZeroBaselineYAxisMin(extent: AxisExtent) {
	return typeof extent.min === 'number' && extent.min < 0 ? extent.min : 0
}

const AXIS_CONFIG_BY_TYPE: Partial<Record<ProtocolChartsLabels, AxisConfig>> = {
	'Token Price': {
		resolveColor: ({ chartColors }) => chartColors['Token Price']
	},
	'Token Volume': {
		resolveColor: ({ chartColors }) => chartColors['Token Volume']
	},
	'Token Liquidity': {
		resolveColor: ({ chartColors }) => chartColors['Token Liquidity']
	},
	'Bridge Deposits': {
		resolveColor: ({ chartColors }) => chartColors['Bridge Deposits']
	},
	Fees: {
		resolveColor: ({ chartColors, chartsInSeries }) =>
			chartsInSeries.has('Fees')
				? chartColors['Fees']
				: chartsInSeries.has('Revenue')
					? chartColors['Revenue']
					: chartsInSeries.has('Holders Revenue')
						? chartColors['Holders Revenue']
						: chartsInSeries.has('Incentives')
							? chartColors['Incentives']
							: chartColors['Fees']
	},
	'DEX Volume': {
		resolveColor: ({ chartColors, chartsInSeries }) =>
			chartsInSeries.has('DEX Volume')
				? chartColors['DEX Volume']
				: chartsInSeries.has('Perp Volume')
					? chartColors['Perp Volume']
					: chartsInSeries.has('Options Premium Volume')
						? chartColors['Options Premium Volume']
						: chartsInSeries.has('Options Notional Volume')
							? chartColors['Options Notional Volume']
							: chartsInSeries.has('Perp Aggregator Volume')
								? chartColors['Perp Aggregator Volume']
								: chartsInSeries.has('Bridge Aggregator Volume')
									? chartColors['Bridge Aggregator Volume']
									: chartsInSeries.has('DEX Aggregator Volume')
										? chartColors['DEX Aggregator Volume']
										: chartColors['DEX Volume']
	},
	'Open Interest': {
		resolveColor: ({ chartColors }) => chartColors['Open Interest']
	},
	Unlocks: {
		formatter: (value, { unlockTokenSymbol }) => `${formattedNum(value)} ${unlockTokenSymbol}`,
		resolveColor: ({ chartColors }) => chartColors['Unlocks']
	},
	'Active Addresses': {
		formatter: (value) => formattedNum(value),
		resolveColor: ({ chartColors, chartsInSeries }) =>
			chartsInSeries.has('Active Addresses') ? chartColors['Active Addresses'] : chartColors['New Addresses']
	},
	Transactions: {
		formatter: (value) => formattedNum(value),
		resolveColor: ({ chartColors }) => chartColors['Transactions']
	},
	'Gas Used': {
		formatter: (value, { gasUsedValueSymbol }) => formatTooltipValue(value, gasUsedValueSymbol),
		resolveColor: ({ chartColors }) => chartColors['Gas Used']
	},
	'Median APY': {
		formatter: (value) => `${value}%`,
		resolveColor: ({ chartColors }) => chartColors['Median APY']
	},
	'USD Inflows': {
		resolveColor: ({ chartColors }) => chartColors['USD Inflows']
	},
	'Total Proposals': {
		formatter: (value) => formattedNum(value),
		resolveColor: ({ chartColors }) => chartColors['Total Proposals']
	},
	'Max Votes': {
		formatter: (value) => formattedNum(value),
		resolveColor: ({ chartColors }) => chartColors['Max Votes']
	},
	Treasury: {
		resolveColor: ({ chartColors }) => chartColors['Treasury']
	},
	Tweets: {
		formatter: (value) => `${value} tweets`,
		resolveColor: ({ chartColors }) => chartColors['Tweets']
	},
	'NFT Volume': {
		resolveColor: ({ chartColors }) => chartColors['NFT Volume']
	}
}

export function buildProtocolYAxis({
	allYAxis,
	baseYAxis,
	chartColors,
	chartsInSeries,
	unlockTokenSymbol,
	gasUsedValueSymbol
}: {
	allYAxis: Array<[ProtocolChartsLabels, number | undefined]>
	baseYAxis: Record<string, unknown>
	chartColors: Record<string, string>
	chartsInSeries: Set<string>
	unlockTokenSymbol: string
	gasUsedValueSymbol: string
}) {
	const finalYAxis: Array<Record<string, unknown>> = []
	const context: AxisBuilderContext = { chartColors, chartsInSeries, unlockTokenSymbol, gasUsedValueSymbol }
	const noOffset = allYAxis.length < 3

	for (const [type, index] of allYAxis) {
		if (type === 'TVL') {
			finalYAxis.push({
				...baseYAxis,
				min: getZeroBaselineYAxisMin
			})
			continue
		}

		const prevOffset = (finalYAxis[finalYAxis.length - 1]?.offset as number | undefined) ?? 0
		const axisOptions: Record<string, unknown> = {
			...baseYAxis,
			name: '',
			type: 'value',
			min: getZeroBaselineYAxisMin,
			alignTicks: true,
			offset: noOffset || index == null || index < 2 ? 0 : prevOffset + (CUSTOM_OFFSETS[type] ?? 40)
		}
		const axisConfig = AXIS_CONFIG_BY_TYPE[type]

		if (axisConfig?.formatter) {
			axisOptions.axisLabel = {
				...(axisOptions.axisLabel as Record<string, unknown>),
				formatter: (value: number) => axisConfig.formatter!(value, context)
			}
		}

		if (axisConfig?.resolveColor) {
			axisOptions.axisLine = {
				show: true,
				lineStyle: {
					...DASHED_AXIS_LINE_STYLE,
					color: axisConfig.resolveColor(context)
				}
			}
		}

		finalYAxis.push(axisOptions)
	}

	if (finalYAxis.length === 0) {
		finalYAxis.push({
			...baseYAxis,
			min: getZeroBaselineYAxisMin
		})
	}

	return finalYAxis
}
