import { getAutoFitYAxisMin, getZeroBaselineYAxisMin } from '~/components/ECharts/axisMin'
import { formatTooltipValue } from '~/components/ECharts/formatters'
import { formattedNum } from '~/utils'
import type { ChainChartLabels } from './constants'

type AxisBuilderContext = {
	chartColors: Record<string, string>
	chartsInSeries: Set<string>
	isThemeDark: boolean
}

type AxisConfig = {
	formatter?: (value: number, context: AxisBuilderContext) => string
	resolveColor?: (context: AxisBuilderContext) => string
}

// Add per-label offset overrides here if a chain metric needs extra y-axis spacing.
const CUSTOM_OFFSETS: Partial<Record<ChainChartLabels, number>> = {}

const DASHED_AXIS_LINE_STYLE = {
	type: [5, 10],
	dashOffset: 5
} as const

const AXIS_CONFIG_BY_TYPE: Partial<Record<ChainChartLabels, AxisConfig>> = {
	'Stablecoins Mcap': {
		resolveColor: ({ chartColors }) => chartColors['Stablecoins Mcap']
	},
	'Chain Fees': {
		resolveColor: ({ chartColors, chartsInSeries }) =>
			chartsInSeries.has('Chain Fees')
				? chartColors['Chain Fees']
				: chartsInSeries.has('Chain Revenue')
					? chartColors['Chain Revenue']
					: chartsInSeries.has('App Fees')
						? chartColors['App Fees']
						: chartColors['App Revenue']
	},
	'DEXs Volume': {
		resolveColor: ({ chartColors }) => chartColors['DEXs Volume']
	},
	'Perps Volume': {
		resolveColor: ({ chartColors }) => chartColors['Perps Volume']
	},
	'Token Incentives': {
		resolveColor: ({ chartColors }) => chartColors['Token Incentives']
	},
	'Bridged TVL': {
		resolveColor: ({ chartColors }) => chartColors['Bridged TVL']
	},
	'Active Addresses': {
		formatter: (value) => formattedNum(value),
		resolveColor: ({ chartColors, chartsInSeries, isThemeDark }) =>
			chartsInSeries.has('Active Addresses')
				? chartColors['Active Addresses']
				: chartsInSeries.has('New Addresses')
					? chartColors['New Addresses']
					: isThemeDark
						? '#fff'
						: '#000'
	},
	Transactions: {
		formatter: (value) => formattedNum(value),
		resolveColor: ({ chartColors }) => chartColors['Transactions']
	},
	'Gas Used': {
		formatter: (value) => formattedNum(value),
		resolveColor: ({ chartColors }) => chartColors['Gas Used']
	},
	'Net Inflows': {
		resolveColor: ({ chartColors }) => chartColors['Net Inflows']
	},
	'Core Developers': {
		formatter: (value) => `${value} devs`,
		resolveColor: ({ chartColors }) => chartColors['Core Developers']
	},
	'Devs Commits': {
		formatter: (value) => `${value} commits`,
		resolveColor: ({ chartColors }) => chartColors['Devs Commits']
	},
	'Token Mcap': {
		formatter: (value) => formatTooltipValue(value, '$'),
		resolveColor: ({ chartColors }) => chartColors['Token Mcap']
	},
	'Token Price': {
		formatter: (value) => formatTooltipValue(value, '$'),
		resolveColor: ({ chartColors }) => chartColors['Token Price']
	},
	'Token Volume': {
		formatter: (value) => formatTooltipValue(value, '$'),
		resolveColor: ({ chartColors }) => chartColors['Token Volume']
	},
	Raises: {
		resolveColor: ({ chartColors }) => chartColors['Raises']
	}
}

export function buildChainYAxis({
	allYAxis,
	baseYAxis,
	barAxisTypes,
	chartColors,
	chartsInSeries,
	isThemeDark
}: {
	allYAxis: Array<[ChainChartLabels, number | undefined]>
	baseYAxis: Record<string, unknown>
	barAxisTypes: ReadonlySet<ChainChartLabels>
	chartColors: Record<string, string>
	chartsInSeries: Set<string>
	isThemeDark: boolean
}) {
	const finalYAxis: Array<Record<string, unknown>> = []
	const context: AxisBuilderContext = { chartColors, chartsInSeries, isThemeDark }
	const noOffset = allYAxis.length < 3

	for (const [type, index] of allYAxis) {
		const min = barAxisTypes.has(type) ? getZeroBaselineYAxisMin : getAutoFitYAxisMin

		if (type === 'TVL') {
			finalYAxis.push({
				...baseYAxis,
				min
			})
			continue
		}

		const prevOffset = (finalYAxis[finalYAxis.length - 1]?.offset as number | undefined) ?? 0
		const axisOptions: Record<string, unknown> = {
			...baseYAxis,
			name: '',
			type: 'value',
			min,
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
			const color = axisConfig.resolveColor(context)
			axisOptions.axisLabel = {
				...(axisOptions.axisLabel as Record<string, unknown>),
				color
			}
			axisOptions.axisLine = {
				show: true,
				lineStyle: {
					...DASHED_AXIS_LINE_STYLE,
					color
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
