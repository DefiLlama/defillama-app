import { useCallback, useEffect, useState } from 'react'
import { useAppMetadata } from '../../AppMetadataContext'
import { useProDashboardCatalog } from '../../ProDashboardAPIContext'
import {
	CHART_TYPES,
	ChartConfig,
	DashboardItemConfig,
	MetricConfig,
	MultiChartConfig,
	UnifiedTableConfig
} from '../../types'
import { generateItemId } from '../../utils/dashboardUtils'
import { ComparisonWizardProvider, useComparisonWizardContext } from './ComparisonWizardContext'
import { WizardNavigation } from './components/WizardNavigation'
import { PreviewStep } from './steps/PreviewStep'
import { SelectItemsStep } from './steps/SelectItemsStep'
import { SelectMetricsStep } from './steps/SelectMetricsStep'
import { SelectTypeStep } from './steps/SelectTypeStep'

interface ComparisonWizardProps {
	onComplete: (data: {
		dashboardName: string
		visibility: 'private' | 'public'
		tags: string[]
		description: string
		items: DashboardItemConfig[]
	}) => void
}

function ComparisonWizardContent({ onComplete }: ComparisonWizardProps) {
	const { state, actions, derived, availableMetrics } = useComparisonWizardContext()
	const { getProtocolInfo } = useProDashboardCatalog()
	const { chainsByName } = useAppMetadata()
	const [isGenerating, setIsGenerating] = useState(false)

	useEffect(() => {
		return () => {
			actions.reset()
		}
	}, [actions.reset])

	const generateComparisonCharts = useCallback((): MultiChartConfig[] => {
		const { selectedItems, selectedMetrics, comparisonType } = state

		if (!comparisonType) return []

		return selectedMetrics
			.map((metric) => {
				const chartTypeInfo = CHART_TYPES[metric as keyof typeof CHART_TYPES]
				const metricInfo = availableMetrics.find((m) => m.metric === metric)

				const chartItems: ChartConfig[] = selectedItems
					.filter((item) => {
						if (comparisonType === 'chains') {
							return chainsByName.has(item)
						}
						return !!getProtocolInfo(item)
					})
					.map((item) => {
						const isChain = comparisonType === 'chains'
						const chainMeta = isChain ? chainsByName.get(item) : null
						const protocol = !isChain ? getProtocolInfo(item) : null
						const isGroupable = chartTypeInfo && 'groupable' in chartTypeInfo && chartTypeInfo.groupable

						return {
							id: generateItemId('chart', `${item}-${metric}`),
							kind: 'chart' as const,
							chain: isChain ? item : '',
							protocol: !isChain ? item : undefined,
							type: metric,
							grouping: isGroupable ? ('day' as const) : undefined,
							geckoId: isChain ? chainMeta?.gecko_id : protocol?.geckoId
						}
					})

				if (chartItems.length === 0) return null

				const metricTitle = metricInfo?.title || chartTypeInfo?.title || metric
				const chartName = selectedItems.length === 1 ? metricTitle : `${metricTitle} Comparison`

				return {
					id: generateItemId('multi', `comparison-${metric}`),
					kind: 'multi' as const,
					name: chartName,
					items: chartItems,
					grouping: state.grouping,
					showStacked: state.displayMode === 'stacked',
					showCumulative: state.displayMode === 'cumulative',
					showPercentage: state.displayMode === 'percentage',
					colSpan: 1 as const
				}
			})
			.filter(Boolean) as MultiChartConfig[]
	}, [state, chainsByName, getProtocolInfo, availableMetrics])

	const generateComparisonMetrics = useCallback((): MetricConfig[] => {
		const { selectedItems, metricsForCards, comparisonType, metricSettings } = state

		if (!comparisonType || metricsForCards.length === 0) return []

		const metrics: MetricConfig[] = []

		for (const metricType of metricsForCards) {
			for (const item of selectedItems) {
				const isChain = comparisonType === 'chains'

				let subject: MetricConfig['subject']
				if (isChain) {
					const chainMeta = chainsByName.get(item)
					subject = {
						itemType: 'chain',
						chain: item,
						geckoId: chainMeta?.gecko_id
					}
				} else {
					const protocol = getProtocolInfo(item)
					subject = {
						itemType: 'protocol',
						protocol: item,
						geckoId: protocol?.geckoId
					}
				}

				metrics.push({
					id: generateItemId('metric', `${item}-${metricType}`),
					kind: 'metric',
					subject,
					type: metricType,
					aggregator: metricSettings.aggregator,
					window: metricSettings.window,
					compare:
						metricSettings.compareMode !== 'none' ? { mode: metricSettings.compareMode, format: 'percent' } : undefined,
					showSparkline: metricSettings.showSparkline,
					colSpan: 0.5
				})
			}
		}

		return metrics
	}, [state, chainsByName, getProtocolInfo])

	const generateComparisonTable = useCallback((): UnifiedTableConfig | null => {
		if (!state.includeTable || !state.comparisonType) return null

		const isChains = state.comparisonType === 'chains'

		return {
			id: generateItemId('unified-table', 'comparison'),
			kind: 'unified-table',
			rowHeaders: isChains ? ['chain'] : ['parent-protocol', 'protocol'],
			filters: {
				protocols: !isChains ? state.selectedItems : undefined,
				chains: isChains ? state.selectedItems : undefined
			},
			columnOrder: isChains
				? ['name', 'tvl', 'change7d', 'fees24h', 'revenue24h', 'volume24h', 'bridgedTvl']
				: ['name', 'tvl', 'change7d', 'fees24h', 'revenue24h', 'volume24h'],
			columnVisibility: {
				name: true,
				tvl: true,
				change7d: true,
				fees24h: true,
				revenue24h: true,
				volume24h: true,
				...(isChains && { bridgedTvl: true })
			},
			defaultSorting: [{ id: 'tvl', desc: true }],
			colSpan: 2
		}
	}, [state.includeTable, state.comparisonType, state.selectedItems])

	const handleGenerate = useCallback(async () => {
		if (!state.dashboardName.trim()) return

		setIsGenerating(true)
		try {
			const metricCards = generateComparisonMetrics()
			const charts = generateComparisonCharts()
			const table = generateComparisonTable()

			const totalEffectiveCols = metricCards.length * 1 + charts.length * 2
			const remainder = totalEffectiveCols % 4

			if (remainder === 2 && charts.length > 0) {
				charts[charts.length - 1].colSpan = 2
			}

			onComplete({
				dashboardName: state.dashboardName.trim(),
				visibility: state.visibility,
				tags: state.tags,
				description: state.description,
				items: [...metricCards, ...charts, ...(table ? [table] : [])]
			})
		} catch (error) {
			console.error('Failed to generate comparison dashboard:', error)
		} finally {
			setIsGenerating(false)
		}
	}, [state, generateComparisonCharts, generateComparisonMetrics, generateComparisonTable, onComplete])

	const renderStep = () => {
		switch (state.step) {
			case 'select-type':
				return <SelectTypeStep />
			case 'select-items':
				return <SelectItemsStep />
			case 'select-metrics':
				return <SelectMetricsStep />
			case 'preview':
				return <PreviewStep />
			default:
				return null
		}
	}

	return (
		<div className="flex min-h-[480px] flex-col">
			<div className="flex-1 overflow-y-auto p-6">{renderStep()}</div>
			<div className="border-t border-(--cards-border) bg-(--cards-bg) px-6 py-4">
				<WizardNavigation
					currentStep={state.step}
					canProceed={derived.canProceed}
					canGoBack={derived.canGoBack}
					onNext={actions.goToNextStep}
					onBack={actions.goToPrevStep}
					onGenerate={handleGenerate}
					isGenerating={isGenerating}
				/>
			</div>
		</div>
	)
}

export function ComparisonWizard({ onComplete }: ComparisonWizardProps) {
	return (
		<ComparisonWizardProvider>
			<ComparisonWizardContent onComplete={onComplete} />
		</ComparisonWizardProvider>
	)
}
