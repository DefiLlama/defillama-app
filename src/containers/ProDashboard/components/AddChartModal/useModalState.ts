import { useEffect, useMemo, useState } from 'react'
import { ChartConfig, DashboardItemConfig, MetricAggregator } from '../../types'
import { ChartBuilderConfig, ChartTabType, CombinedTableType, MainTabType, ModalState } from './types'

export function useModalState(editItem?: DashboardItemConfig | null, isOpen?: boolean) {
	const [selectedMainTab, setSelectedMainTab] = useState<MainTabType>('charts')
	const [selectedChartTab, setSelectedChartTab] = useState<ChartTabType>('chain')
	const [composerItems, setComposerItems] = useState<ChartConfig[]>([])
	const [selectedChain, setSelectedChain] = useState<string | null>(null)
	const [selectedChains, setSelectedChains] = useState<string[]>([])
	const [selectedProtocols, setSelectedProtocols] = useState<string[]>([])
	const [selectedProtocol, setSelectedProtocol] = useState<string | null>(null)
	const [selectedChartType, setSelectedChartType] = useState<string>('tvl')
	const [selectedChartTypes, setSelectedChartTypes] = useState<string[]>([])
	const [unifiedChartName, setUnifiedChartName] = useState<string>('')
	const [chartCreationModeState, setChartCreationModeState] = useState<'separate' | 'combined'>('separate')

	const setChartCreationMode = (mode: 'separate' | 'combined') => {
		setChartCreationModeState(mode)
	}
	const [textTitle, setTextTitle] = useState<string>('')
	const [textContent, setTextContent] = useState<string>('')
	const [selectedTableType, setSelectedTableType] = useState<CombinedTableType>('protocols')
	const [selectedDatasetChain, setSelectedDatasetChain] = useState<string | null>(null)
	const [selectedDatasetTimeframe, setSelectedDatasetTimeframe] = useState<string | null>(null)
	const [selectedTokens, setSelectedTokens] = useState<string[]>([])
	const [includeCex, setIncludeCex] = useState<boolean>(false)
	const [chartBuilderName, setChartBuilderName] = useState<string>('')
	const [chartBuilder, setChartBuilder] = useState<ChartBuilderConfig>({
		metric: 'tvl',
		mode: 'chains',
		filterMode: 'include',
		chains: [],
		chainCategories: [],
		categories: [],
		groupBy: 'protocol',
		limit: 10,
		chartType: 'stackedArea',
		displayAs: 'timeSeries',
		additionalFilters: {}
	})

	const [metricSubjectType, setMetricSubjectType] = useState<'chain' | 'protocol'>('chain')
	const [metricChain, setMetricChain] = useState<string | null>(null)
	const [metricProtocol, setMetricProtocol] = useState<string | null>(null)
	const [metricType, setMetricType] = useState<string>('tvl')
	const [metricAggregator, setMetricAggregator] = useState<MetricAggregator>('latest')
	const [metricWindow, setMetricWindow] = useState<'7d' | '30d' | '90d' | '365d' | 'ytd' | '3y' | 'all'>('30d')
	const [metricLabel, setMetricLabel] = useState<string>('')
	const [metricShowSparkline, setMetricShowSparkline] = useState<boolean>(true)

	// Initialize state based on editItem
	useEffect(() => {
		if (editItem) {
			if (editItem.kind === 'chart') {
				setSelectedMainTab('charts')
				setSelectedChartTab(editItem.protocol ? 'protocol' : 'chain')
				setSelectedChain(editItem.chain || null)
				setSelectedProtocol(editItem.protocol || null)
				setSelectedChartType(editItem.type)
				setSelectedChartTypes([editItem.type])
				setChartCreationModeState('separate')
				setUnifiedChartName('')
			} else if (editItem.kind === 'multi') {
				setSelectedMainTab('charts')
				setComposerItems(editItem.items)
				setUnifiedChartName(editItem.name || '')
				setChartCreationModeState('combined')
				if (editItem.items.length > 0) {
					const firstItem = editItem.items[0]
					setSelectedChartTab(firstItem.protocol ? 'protocol' : 'chain')
					setSelectedChartTypes([])
					if (firstItem.protocol) {
						setSelectedProtocol(firstItem.protocol)
					} else if (firstItem.chain) {
						setSelectedChain(firstItem.chain)
					}
				}
			} else if (editItem.kind === 'table') {
				setSelectedMainTab('table')
				setSelectedChains(editItem.chains || [])
				if (editItem.tableType === 'dataset') {
					setSelectedTableType(editItem.datasetType || 'stablecoins')
					setSelectedDatasetChain(editItem.datasetChain || null)
					setSelectedDatasetTimeframe(editItem.datasetTimeframe || null)
					if (editItem.datasetType === 'token-usage') {
						setSelectedTokens(editItem.tokenSymbols || [])
						setIncludeCex(editItem.includeCex || false)
					}
				} else {
					setSelectedTableType('protocols')
				}
			} else if (editItem.kind === 'text') {
				setSelectedMainTab('text')
				setTextTitle(editItem.title || '')
				setTextContent(editItem.content)
			} else if (editItem.kind === 'builder') {
				setSelectedMainTab('builder')
				setChartBuilderName(editItem.name || '')
				setChartBuilder({
					...editItem.config,
					mode: editItem.config.mode || 'chains'
				})
			} else if (editItem.kind === 'metric') {
				setSelectedMainTab('metric')
				setMetricSubjectType(editItem.subject.itemType)
				setMetricChain(editItem.subject.chain || null)
				setMetricProtocol(editItem.subject.protocol || null)
				setMetricType(editItem.type)
				setMetricAggregator(editItem.aggregator)
				setMetricWindow(editItem.window)
				setMetricLabel(editItem.label || '')
				setMetricShowSparkline(editItem.showSparkline !== false)
			}
		} else {
			setSelectedMainTab('charts')
			setSelectedChartTab('chain')
			setComposerItems([])
			setSelectedChain(null)
			setSelectedChains([])
			setSelectedProtocol(null)
			setSelectedProtocols([])
			setSelectedChartType('tvl')
			setSelectedChartTypes([])
			setUnifiedChartName('')
			setChartCreationModeState('separate')
			setTextTitle('')
			setTextContent('')
			setSelectedTableType('protocols')
			setSelectedDatasetChain(null)
			setSelectedDatasetTimeframe(null)
			setSelectedTokens([])
			setIncludeCex(false)
			setChartBuilderName('')
			setChartBuilder({
				metric: 'tvl',
				mode: 'chains',
				filterMode: 'include',
				chains: [],
				chainCategories: [],
				categories: [],
				groupBy: 'protocol',
				limit: 10,
				chartType: 'stackedArea',
				displayAs: 'timeSeries',
				additionalFilters: {}
			})
			setMetricSubjectType('chain')
			setMetricChain(null)
			setMetricProtocol(null)
			setMetricType('tvl')
			setMetricAggregator('latest')
			setMetricWindow('30d')
			setMetricLabel('')
			setMetricShowSparkline(true)
		}
	}, [editItem, isOpen])

	const resetState = () => {
		setComposerItems([])
		setTextTitle('')
		setTextContent('')
		setSelectedChartType('tvl')
		setSelectedChartTypes([])
		setUnifiedChartName('')
		setChartCreationModeState('separate')
		setSelectedChain(null)
		setSelectedChains([])
		setSelectedProtocol(null)
		setSelectedProtocols([])
		setSelectedTableType('protocols')
		setSelectedDatasetChain(null)
		setSelectedDatasetTimeframe(null)
		setSelectedTokens([])
		setIncludeCex(false)
		setChartBuilderName('')
		setChartBuilder({
			metric: 'tvl',
			mode: 'chains',
			chains: [],
			chainCategories: [],
			categories: [],
			groupBy: 'protocol',
			limit: 10,
			chartType: 'stackedArea',
			displayAs: 'timeSeries',
			additionalFilters: {}
		})
		setMetricSubjectType('chain')
		setMetricChain(null)
		setMetricProtocol(null)
		setMetricType('tvl')
		setMetricAggregator('latest')
		setMetricWindow('30d')
		setMetricLabel('')
		setMetricShowSparkline(true)
	}

	const state: ModalState = {
		selectedMainTab,
		selectedChartTab,
		composerItems,
		selectedChain,
		selectedChains,
		selectedProtocol,
		selectedProtocols,
		selectedChartType,
		selectedChartTypes,
		unifiedChartName,
		chartCreationMode: chartCreationModeState,
		textTitle,
		textContent,
		selectedTableType,
		selectedDatasetChain,
		selectedDatasetTimeframe,
		selectedTokens,
		includeCex,
		chartBuilderName,
		chartBuilder,
		metricSubjectType,
		metricChain,
		metricProtocol,
		metricType,
		metricAggregator,
		metricWindow,
		metricLabel,
		metricShowSparkline
	}

	const actionsObj = useMemo(
		() => ({
			setSelectedMainTab,
			setSelectedChartTab,
			setComposerItems,
			setSelectedChain,
			setSelectedChains,
			setSelectedProtocol,
			setSelectedProtocols,
			setSelectedChartType,
			setSelectedChartTypes,
			setUnifiedChartName,
			setChartCreationMode,
			setTextTitle,
			setTextContent,
			setSelectedTableType,
			setSelectedDatasetChain,
			setSelectedDatasetTimeframe,
			setSelectedTokens,
			setIncludeCex,
			setChartBuilderName,
			setChartBuilder,
			setMetricSubjectType,
			setMetricChain,
			setMetricProtocol,
			setMetricType,
			setMetricAggregator,
			setMetricWindow,
			setMetricLabel,
			setMetricShowSparkline
		}),
		[
			setSelectedMainTab,
			setSelectedChartTab,
			setComposerItems,
			setSelectedChain,
			setSelectedChains,
			setSelectedProtocol,
			setSelectedChartType,
			setSelectedChartTypes,
			setUnifiedChartName,
			setChartCreationMode,
			setTextTitle,
			setTextContent,
			setSelectedTableType,
			setSelectedDatasetChain,
			setSelectedDatasetTimeframe,
			setSelectedTokens,
			setIncludeCex,
			setChartBuilderName,
			setChartBuilder,
			setMetricSubjectType,
			setMetricChain,
			setMetricProtocol,
			setMetricType,
			setMetricAggregator,
			setMetricWindow,
			setMetricLabel,
			setMetricShowSparkline
		]
	)

	return {
		state,
		actions: actionsObj,
		resetState
	}
}
