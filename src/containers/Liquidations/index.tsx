import { useMutation } from '@tanstack/react-query'
import type { ECharts } from 'echarts/core'
import { useRouter } from 'next/router'
import * as React from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import type { IMultiSeriesChart2Props, MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { Switch } from '~/components/Switch'
import { CHART_COLORS } from '~/constants/colors'
import {
	type ChartData,
	type LiquidationsChartSeriesByGroup,
	getLiquidationsCsvData
} from '~/containers/Liquidations/utils'
import { LIQS_SETTINGS, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { formattedNum, liquidationsIconUrl } from '~/utils'
import { download } from '~/utils/download'
import { pushShallowQuery } from '~/utils/routerQuery'

const MultiSeriesChart2 = React.lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

export const LiquidationsContainer = (props: {
	data: ChartData
	prevData: ChartData
	chartSeries: LiquidationsChartSeriesByGroup
}) => {
	const { data, prevData, chartSeries } = props

	const [liqsSettings, toggleLiqsSettings] = useLocalStorageSettingsManager('liquidations')
	const { LIQS_USING_USD, LIQS_CUMULATIVE } = LIQS_SETTINGS
	const isLiqsUsingUsd = liqsSettings[LIQS_USING_USD]
	const isLiqsCumulative = liqsSettings[LIQS_CUMULATIVE]
	const nativeSymbol = data.symbol.toUpperCase()
	const router = useRouter()
	const { stackBy: stackByQuery } = router.query as { stackBy?: 'chains' | 'protocols' }
	const stackBy = stackByQuery ?? 'protocols'
	const chartInstanceRef = React.useRef<ECharts | null>(null)

	const { mutate: handleCsvDownload, isPending } = useMutation({
		mutationFn: async () => {
			const csvString = await getLiquidationsCsvData(data.symbol)
			download(`${data.symbol}-all-positions.csv`, csvString)
		}
	})

	const handleToggleUsd = React.useCallback(() => {
		toggleLiqsSettings(LIQS_USING_USD)
	}, [toggleLiqsSettings, LIQS_USING_USD])

	const handleToggleCumulative = React.useCallback(() => {
		toggleLiqsSettings(LIQS_CUMULATIVE)
	}, [toggleLiqsSettings, LIQS_CUMULATIVE])

	const onChartReady = React.useCallback((instance: ECharts | null) => {
		chartInstanceRef.current = instance
	}, [])

	React.useEffect(() => {
		return () => {
			chartInstanceRef.current = null
		}
	}, [])

	const formattedChart = React.useMemo(() => {
		const group = chartSeries[stackBy]
		const bins = group?.bins ?? []
		const series = group?.series ?? []

		const seriesValues: Record<string, number[]> = {}
		for (const entry of series) {
			const values = isLiqsUsingUsd ? entry.usd : entry.native
			if (!isLiqsCumulative) {
				seriesValues[entry.label] = values
				continue
			}
			const cumulative: number[] = new Array(values.length)
			let running = 0
			for (let i = values.length - 1; i >= 0; i--) {
				running += values[i]
				cumulative[i] = running
			}
			seriesValues[entry.label] = cumulative
		}

		const dimensions = ['price', ...series.map((entry) => entry.label)]
		const source = bins.map((price, index) => {
			const row: Record<string, number> = { price }
			for (const entry of series) {
				row[entry.label] = seriesValues[entry.label]?.[index] ?? 0
			}
			return row
		})

		const charts = series.map((entry, index) => ({
			type: 'bar' as const,
			name: entry.label,
			encode: { x: 'price', y: entry.label },
			stack: 'liquidations',
			color: CHART_COLORS[index % CHART_COLORS.length],
			large: true
		}))

		return { dataset: { source, dimensions } satisfies MultiSeriesChart2Dataset, charts }
	}, [chartSeries, stackBy, isLiqsUsingUsd, isLiqsCumulative])
	const deferredFormattedChart = React.useDeferredValue(formattedChart)

	const chartOptions = React.useMemo(() => {
		// `IMultiSeriesChart2Props['chartOptions']` is typed as a shallow object-of-objects,
		// but ECharts options are nested. Cast via `unknown` to avoid fighting that shape here.
		const options = {
			legend: {
				orient: 'horizontal',
				top: 0,
				left: 12,
				right: 12,
				// By default everything is selected; don't allow toggling/deselect.
				selectedMode: false
			},
			xAxis: {
				type: 'category',
				axisLabel: {
					formatter: (value: string) => `$${Number(value).toFixed(3)}`
				},
				axisTick: { alignWithLabel: true },
				splitLine: {
					lineStyle: { color: '#a1a1aa', opacity: 0.1 }
				}
			},
			yAxis: {
				type: 'value',
				position: isLiqsCumulative ? 'left' : 'right',
				axisLabel: {
					formatter: (value: number) =>
						isLiqsUsingUsd ? `${formattedNum(value, true)}` : `${formattedNum(value)} ${nativeSymbol}`
				},
				splitLine: {
					lineStyle: { color: '#a1a1aa', opacity: 0.1 }
				}
			},
			grid: {
				left: '2%',
				right: '1%',
				top: 36,
				bottom: 56,
				outerBoundsMode: 'same',
				outerBoundsContain: 'axisLabel'
			},
			tooltip: {
				trigger: 'axis',
				confine: true,
				backgroundColor: 'transparent',
				borderWidth: 0,
				padding: 0,
				textStyle: {
					color: 'var(--text-primary)',
					fontSize: 12,
					fontFamily: 'inherit'
				},
				axisPointer: {
					type: 'cross',
					label: {
						backgroundColor: '#2f5ed4',
						color: '#fff',
						borderColor: '#2f5ed4',
						borderWidth: 1,
						borderRadius: 4,
						padding: [4, 8],
						formatter: (value: unknown) => {
							const raw = isRecord(value) && 'value' in value ? ((value as { value?: unknown }).value ?? value) : value
							const numeric = Number(raw)
							if (!Number.isFinite(numeric)) return String(raw)
							const axisDimension =
								isRecord(value) && 'axisDimension' in value
									? (value as { axisDimension?: unknown }).axisDimension
									: undefined
							if (axisDimension === 'x') {
								return `$${numeric.toFixed(3)}`
							}
							return isLiqsUsingUsd ? `${formattedNum(numeric, true)}` : `${formattedNum(numeric)} ${nativeSymbol}`
						}
					}
				},
				formatter: (params: unknown) => {
					const paramList: unknown[] = Array.isArray(params) ? params : []
					const first = paramList[0]
					const axisLabel = isRecord(first) && typeof first.axisValueLabel === 'string' ? first.axisValueLabel : ''

					const getValue = (item: unknown): number => {
						if (!isRecord(item)) return 0
						const seriesName = typeof item.seriesName === 'string' ? item.seriesName : null

						if (isRecord(item.data) && seriesName) {
							const val = item.data[seriesName]
							return typeof val === 'number' ? val : 0
						}

						if (Array.isArray(item.value)) {
							const encodeY = isRecord(item.encode) ? item.encode.y : undefined
							const yIndex = typeof encodeY === 'number' ? encodeY : 1
							const val = item.value[yIndex]
							return typeof val === 'number' ? val : 0
						}

						return typeof item.value === 'number' ? item.value : 0
					}

					const total = paramList.reduce<number>((acc, item) => acc + getValue(item), 0)
					const totalLabel = isLiqsUsingUsd ? `${formattedNum(total, true)}` : `${formattedNum(total)} ${nativeSymbol}`
					const header = `<div style="margin-bottom: 6px; font-weight: 600; font-size: 12px; letter-spacing: 0.01em; color: #9ca3af;">
						${isLiqsCumulative ? `Total liquidatable ≤ ` : `Liquidations at ~`}${axisLabel}
					</div>
					<div style="margin-bottom: 8px; font-size: 12px; opacity: 0.9;">
						<span style="font-weight: 500;">Total</span><span style="opacity: 0.6;"> :</span> ${totalLabel}
					</div>`
					const rows = paramList
						.map((param) => {
							if (!isRecord(param)) return null
							const value = getValue(param)
							const rowValue = isLiqsUsingUsd
								? `${formattedNum(value, true)}`
								: `${formattedNum(value)} ${nativeSymbol}`
							const color = typeof param.color === 'string' ? param.color : 'inherit'
							const seriesName = typeof param.seriesName === 'string' ? param.seriesName : ''
							return `<span style="color: ${color}; margin-bottom: 2px; font-weight: 500; font-size: 12px;">${seriesName}</span><span style="opacity: 0.6; font-size: 12px;"> :</span> <span style="font-size: 12px;">${rowValue}</span>`
						})
						.filter((row): row is string => typeof row === 'string')
						.join('<br/>')
					return `<div style="background: var(--bg-card); border: 1px solid var(--bg-border); box-shadow: 0 6px 24px rgba(0,0,0,0.25); color: var(--text-primary); border-radius: 10px; padding: 10px 12px; font-size: 12px; line-height: 1.4; white-space: nowrap;">
						${header}
						${rows}
					</div>`
				}
			}
		}

		return options as unknown as IMultiSeriesChart2Props['chartOptions']
	}, [isLiqsCumulative, isLiqsUsingUsd, nativeSymbol])

	const liquidableChanges = React.useMemo(
		() => getLiquidableChangesRatio(data, prevData, stackBy),
		[data, prevData, stackBy]
	)

	const dangerousPositionsAmount = React.useMemo(() => getDangerousPositionsAmount(data, stackBy), [data, stackBy])

	const totalLiquidable = React.useMemo(() => getTotalLiquidable(data), [data])

	return (
		<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
			<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
				<h1 className="flex items-center gap-2">
					<img
						src={liquidationsIconUrl(data.symbol.toLowerCase())}
						alt={data.name}
						width={24}
						height={24}
						className="shrink-0 rounded-full"
					/>
					<span className="text-xl font-semibold">
						{data.name} (${data.symbol.toUpperCase()})
					</span>
				</h1>
				<p className="flex flex-col">
					<span className="text-(--text-label)">Total Liquidatable (USD)</span>
					<span className="font-jetbrains text-2xl font-semibold">{formattedNum(totalLiquidable, true)}</span>
				</p>
				<p className="hidden flex-col md:flex">
					<span className="text-(--text-label)">Liquidatable value change (24h)</span>
					<span className="font-jetbrains text-2xl font-semibold">{(liquidableChanges * 100).toFixed(1) || 0}%</span>
				</p>
				<p className="hidden flex-col md:flex">
					<span className="text-(--text-label)">Within -20% of current price</span>
					<span className="font-jetbrains text-2xl font-semibold">{formattedNum(dangerousPositionsAmount, true)}</span>
				</p>
				<CSVDownloadButton onClick={handleCsvDownload} isLoading={isPending} smol className="mt-auto mr-auto" />
			</div>
			<div className="col-span-2 flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<div className="flex flex-wrap items-center justify-end gap-2 p-2">
					<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form) max-sm:w-full">
						<button
							data-active={stackBy === 'protocols'}
							onClick={() => {
								pushShallowQuery(router, { stackBy: 'protocols' })
							}}
							className="inline-flex shrink-0 items-center justify-center gap-1 px-3 py-1.5 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white max-sm:flex-1"
						>
							<Icon name="map" height={14} width={14} />
							<span>Protocols</span>
						</button>
						<button
							data-active={stackBy === 'chains'}
							onClick={() => {
								pushShallowQuery(router, { stackBy: 'chains' })
							}}
							className="inline-flex shrink-0 items-center justify-center gap-1 px-3 py-1.5 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white max-sm:flex-1"
						>
							<Icon name="link" height={14} width={14} />
							<span>Chains</span>
						</button>
					</div>
					<CurrencyToggle symbol={data.symbol} isLiqsUsingUsd={isLiqsUsingUsd} onToggle={handleToggleUsd} />
					<CumulativeToggle isLiqsCumulative={isLiqsCumulative} onToggle={handleToggleCumulative} />
					<ChartExportButtons
						chartInstance={() => chartInstanceRef.current}
						filename={`liquidations-${data.symbol.toLowerCase()}-${stackBy}`}
						title={`${data.name} Liquidations`}
						smol
					/>
				</div>
				<React.Suspense fallback={<div className="min-h-[360px]" />}>
					<MultiSeriesChart2
						dataset={deferredFormattedChart.dataset}
						charts={deferredFormattedChart.charts}
						chartOptions={chartOptions}
						containerClassName="min-h-[360px]"
						hideDefaultLegend={false}
						onReady={onChartReady}
						valueSymbol={isLiqsUsingUsd ? '$' : ''}
					/>
				</React.Suspense>

				<LastUpdated data={data} />
			</div>
		</div>
	)
}

const CurrencyToggle = (props: { symbol: string; isLiqsUsingUsd: boolean; onToggle: () => void }) => {
	return (
		<div className="mr-auto flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form) max-sm:w-full">
			<button
				data-active={!props.isLiqsUsingUsd}
				onClick={props.onToggle}
				className="inline-flex shrink-0 items-center justify-center px-3 py-1.5 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white max-sm:flex-1"
			>
				{props.symbol.toUpperCase()}
			</button>
			<button
				data-active={props.isLiqsUsingUsd}
				onClick={props.onToggle}
				className="inline-flex shrink-0 items-center justify-center px-3 py-1.5 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white max-sm:flex-1"
			>
				USD
			</button>
		</div>
	)
}

const CumulativeToggle = (props: { isLiqsCumulative: boolean; onToggle: () => void }) => {
	return (
		<Switch
			label="Cumulative"
			onChange={props.onToggle}
			checked={props.isLiqsCumulative}
			value="Cumulative"
			className="ml-auto"
		/>
	)
}

const LastUpdated = ({ data }: { data: ChartData }) => {
	const [minutesAgo, setMinutesAgo] = React.useState(() =>
		Math.round((Date.now() - (data?.time ?? 0) * 1000) / 1000 / 60)
	)

	const onUpdateMinutesAgo = React.useEffectEvent(() => {
		const baseTime = data?.time != null ? data.time * 1000 : Date.now()
		setMinutesAgo(Math.round((Date.now() - baseTime) / 1000 / 60))
	})

	React.useEffect(() => {
		onUpdateMinutesAgo()
		const interval = setInterval(() => {
			onUpdateMinutesAgo()
		}, 1000 * 60)
		return () => clearInterval(interval)
	}, [data?.time])

	const formatted = formatMinutesAgo(minutesAgo)

	return (
		<div className="flex items-center justify-end gap-1 p-2 pt-0 text-xs text-(--text-label) italic opacity-70">
			<Icon name="clock" height={12} width={12} />
			<span suppressHydrationWarning>Last updated {formatted}</span>
		</div>
	)
}

const formatMinutesAgo = (minutesAgo: number) => {
	if (!Number.isFinite(minutesAgo) || minutesAgo < 0) return 'just now'
	if (minutesAgo < 1) return 'just now'
	if (minutesAgo < 60) return `${minutesAgo} min ago`
	const hours = Math.floor(minutesAgo / 60)
	const minutes = minutesAgo % 60
	if (minutesAgo < 60 * 24) {
		return minutes > 0 ? `${hours}h ${minutes}m ago` : `${hours}h ago`
	}
	const days = Math.floor(minutesAgo / (60 * 24))
	const remainingHours = Math.floor((minutesAgo - days * 24 * 60) / 60)
	return remainingHours > 0 ? `${days}d ${remainingHours}h ago` : `${days}d ago`
}

const getTotalLiquidable = (data: ChartData) => {
	return data.totalLiquidable
}

const getLiquidableChangesRatio = (data: ChartData, prevData: ChartData, stackBy: 'chains' | 'protocols') => {
	let current = 0
	let prev = 0
	const currentMap = stackBy === 'chains' ? data.totalLiquidables.chains : data.totalLiquidables.protocols
	const prevMap = stackBy === 'chains' ? prevData.totalLiquidables.chains : prevData.totalLiquidables.protocols

	for (const key in currentMap) {
		if (!prevMap[key]) continue
		current += currentMap[key] ?? 0
		prev += prevMap[key] ?? 0
	}

	const changesRatio = prev === 0 ? 0 : (current - prev) / prev
	return Number.isFinite(changesRatio) ? changesRatio : 0
}

const getDangerousPositionsAmount = (data: ChartData, stackBy: 'chains' | 'protocols', threshold = -0.2) => {
	// Default behavior: everything selected, use precomputed value.
	if (threshold === -0.2) return data.dangerousPositionsAmount

	const priceThreshold = data.currentPrice * (1 + threshold)
	let total = 0
	const groups = stackBy === 'chains' ? data.chartDataBins.chains : data.chartDataBins.protocols
	for (const key in groups) {
		const binSize = groups[key]?.binSize ?? 0
		const bins = groups[key]?.bins ?? {}
		for (const bin in bins) {
			if (binSize * parseInt(bin) >= priceThreshold) {
				total += bins[bin]['usd']
			}
		}
	}
	return total
}
