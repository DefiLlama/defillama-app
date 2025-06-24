import { Icon } from '~/components/Icon'
import dynamic from 'next/dynamic'
import { ChartConfig, CHART_TYPES, Chain, Protocol } from '../types'
import { LoadingSpinner } from './LoadingSpinner'
import { getItemIconUrl, generateChartColor } from '../utils'
import { useProDashboard } from '../ProDashboardAPIContext'
import { memo, useEffect, useState } from 'react'
import { parseLlamaScript } from '~/containers/ProDashboard/utils/llamascript.chevrotain'
import { interpretLlamaScriptCST } from '~/containers/ProDashboard/utils/llamascript.interpreter'
import { ChartPreview } from './ChartPreview'

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
})

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
})

interface ChartCardProps {
	chart: ChartConfig
}

interface ChartRendererProps {
	chart: ChartConfig
	data: [string, number][]
	isLoading: boolean
	hasError: boolean
	refetch: () => void
	color: string
}

const ChartRenderer = memo(function ChartRenderer({
	chart,
	data,
	isLoading,
	hasError,
	refetch,
	color
}: ChartRendererProps) {
	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full">
				<LoadingSpinner />
			</div>
		)
	}

	if (hasError) {
		return (
			<div className="flex flex-col items-center justify-center h-full pro-text3">
				<Icon name="alert-triangle" height={24} width={24} className="mb-2 text-[#F2994A]" />
				<p>Error loading data</p>
				<button className="mt-2 text-sm text-[var(--primary1)] hover:underline" onClick={() => refetch()}>
					Try again
				</button>
			</div>
		)
	}

	if (!data || data.length === 0) {
		return <div className="flex items-center justify-center h-full pro-text3">No data available</div>
	}

	const chartType = CHART_TYPES[chart.type]

	if (chartType.chartType === 'bar') {
		return <BarChart chartData={data} valueSymbol="$" height="300px" color={color} hideDataZoom hideDownloadButton />
	} else {
		return <AreaChart chartData={data} valueSymbol="$" color={color} height="300px" hideDataZoom hideDownloadButton />
	}
})

const LlamaScriptChart = memo(function LlamaScriptChart({ chart }: { chart: ChartConfig }) {
	const [output, setOutput] = useState<any>(null)
	const [parseErrors, setParseErrors] = useState<any[]>([])

	useEffect(() => {
		let cancelled = false
		async function runScript() {
			try {
				const result = parseLlamaScript(chart.llamascript!)
				setParseErrors(result.parseErrors)
				if (result.parseErrors.length === 0 && result.cst) {
					const out = await interpretLlamaScriptCST(result.cst)
					if (!cancelled) setOutput(out)
				} else {
					if (!cancelled) setOutput(null)
				}
			} catch (err) {
				if (!cancelled) setOutput({ errors: [err?.message || String(err)] })
			}
		}
		runScript()
		return () => {
			cancelled = true
		}
	}, [chart.llamascript])

	const llamaChartName = chart.name || 'LlamaScript Chart'

	let multiSeries: any[] = []
	if (output && output.plots && output.plots.length > 0) {
		multiSeries = output.plots.map((plot: any, i: number) => {
			let arg = plot.evalArgs && plot.evalArgs[0]
			if (arg && typeof arg === 'object' && !Array.isArray(arg) && Object.keys(arg).length === 1) {
				arg = arg[Object.keys(arg)[0]]
			}
			let data: [number, number][] | undefined = undefined
			if (Array.isArray(arg) && arg.length > 0 && Array.isArray(arg[0])) {
				data = arg as [number, number][]
			} else if (typeof arg === 'number') {
				const now = Math.floor(Date.now() / 1000)
				data = Array.from({ length: 30 }, (_, j) => [now - (29 - j) * 86400, arg])
			}
			return {
				data: data || [],
				chartType: plot.chartType || 'area',
				name: plot.label || (typeof arg === 'object' && arg?.name ? arg.name : `Series ${i + 1}`),
				color: plot.color
			}
		})
	}
	const highlights = output && output.highlights ? output.highlights : undefined

	return (
		<div className="p-4 h-full flex flex-col">
			<div className="flex justify-between items-center mb-2 pr-28">
				<div className="flex items-center gap-2">
					<h2 className="text-lg font-semibold">{llamaChartName}</h2>
				</div>
			</div>
			<div style={{ height: '300px', flexGrow: 1 }}>
				<ChartPreview multiSeries={multiSeries} highlights={highlights} />
			</div>
		</div>
	)
})

export const ChartCard = memo(function ChartCard({ chart }: ChartCardProps) {
	const { getChainInfo, getProtocolInfo, handleGroupingChange } = useProDashboard()
	const { data, isLoading, hasError, refetch } = chart
	const chartTypeDetails = CHART_TYPES[chart.type]
	const isGroupable = chartTypeDetails?.groupable

	const groupingOptions: ('day' | 'week' | 'month')[] = ['day', 'week', 'month']

	if (chart.type === 'llamascript' && chart.llamascript) {
		return <LlamaScriptChart chart={chart} />
	}

	let itemName: string = ''
	let itemIconUrl: string | undefined = undefined
	let itemInfo: Chain | Protocol | undefined
	let itemIdentifier: string = ''
	console.log('chart', chart)

	if (chart.protocol) {
		itemInfo = getProtocolInfo(chart.protocol)
		itemName = itemInfo?.name || chart.protocol
		itemIconUrl = getItemIconUrl('protocol', itemInfo, chart.protocol)
		itemIdentifier = chart.protocol
	} else if (chart.chain) {
		itemInfo = getChainInfo(chart.chain)
		itemName = chart.chain
		itemIconUrl = getItemIconUrl('chain', itemInfo, chart.chain)
		itemIdentifier = chart.chain
	}

	const chartColor = generateChartColor(itemIdentifier, chartTypeDetails.color)

	return (
		<div className="p-4 h-full flex flex-col">
			<div className="flex justify-between items-center mb-2 pr-28">
				<div className="flex items-center gap-2">
					{chart.chain !== 'All' &&
						(itemIconUrl ? (
							<img src={itemIconUrl} alt={itemName} className="w-6 h-6 rounded-full" />
						) : (
							<div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-600">
								{itemName?.charAt(0)?.toUpperCase()}
							</div>
						))}
					<h2 className="text-lg font-semibold">
						{itemName} {chartTypeDetails.title}
					</h2>
				</div>
				<div className="flex items-center gap-2">
					{isGroupable && (
						<div className="flex border border-[var(--form-control-border)] overflow-hidden">
							{groupingOptions.map((option, index) => (
								<button
									key={option}
									onClick={() => handleGroupingChange(chart.id, option)}
									className={`px-3 py-1 text-xs font-medium transition-colors duration-150 ease-in-out 
										${index > 0 ? 'border-l border-[var(--form-control-border)]' : ''}
										${
											chart.grouping === option
												? 'bg-[var(--primary1)] text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary1)] focus:ring-opacity-50'
												: 'bg-transparent pro-hover-bg pro-text2 focus:outline-none focus:ring-1 focus:ring-[var(--form-control-border)]'
										}`}
								>
									{option.charAt(0).toUpperCase() + option.slice(1)}
								</button>
							))}
						</div>
					)}
				</div>
			</div>

			<div style={{ height: '300px', flexGrow: 1 }}>
				<ChartRenderer
					chart={chart}
					data={data}
					isLoading={isLoading}
					hasError={hasError}
					refetch={refetch}
					color={chartColor}
				/>
			</div>
		</div>
	)
})
