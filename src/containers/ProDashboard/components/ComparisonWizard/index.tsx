import { useCallback, useEffect, useState } from 'react'
import { useAppMetadata } from '../../AppMetadataContext'
import { useProDashboard } from '../../ProDashboardAPIContext'
import { CHART_TYPES, ChartConfig, MultiChartConfig } from '../../types'
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
		items: MultiChartConfig[]
	}) => void
}

function ComparisonWizardContent({ onComplete }: ComparisonWizardProps) {
	const { state, actions, derived, availableMetrics } = useComparisonWizardContext()
	const { getProtocolInfo } = useProDashboard()
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

	const handleGenerate = useCallback(async () => {
		if (!state.dashboardName.trim()) return

		setIsGenerating(true)
		try {
			const items = generateComparisonCharts()
			onComplete({
				dashboardName: state.dashboardName.trim(),
				visibility: state.visibility,
				tags: state.tags,
				description: state.description,
				items
			})
		} catch (error) {
			console.error('Failed to generate comparison dashboard:', error)
		} finally {
			setIsGenerating(false)
		}
	}, [state, generateComparisonCharts, onComplete])

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
