import { useEffect, useMemo, useState } from 'react'
import { ChartConfig, DashboardItemConfig } from '../../types'
import { ChartBuilderConfig, ChartTabType, CombinedTableType, MainTabType, ModalState } from './types'

export function useModalState(editItem?: DashboardItemConfig | null, isOpen?: boolean) {
	const [selectedMainTab, setSelectedMainTab] = useState<MainTabType>('charts')
	const [selectedChartTab, setSelectedChartTab] = useState<ChartTabType>('chain')
	const [composerItems, setComposerItems] = useState<ChartConfig[]>([])
	const [selectedChain, setSelectedChain] = useState<string | null>(null)
	const [selectedChains, setSelectedChains] = useState<string[]>([])
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
		chains: [],
		categories: [],
		groupBy: 'protocol',
		limit: 10,
		chartType: 'stackedArea',
		displayAs: 'timeSeries',
		additionalFilters: {}
	})

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
					const chartTypes = editItem.items.map((item) => item.type)
					setSelectedChartTypes(chartTypes)
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
				setChartBuilder(editItem.config)
			}
		} else {
			setSelectedMainTab('charts')
			setSelectedChartTab('chain')
			setComposerItems([])
			setSelectedChain(null)
			setSelectedChains([])
			setSelectedProtocol(null)
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
				chains: [],
				categories: [],
				groupBy: 'protocol',
				limit: 10,
				chartType: 'stackedArea',
				displayAs: 'timeSeries',
				additionalFilters: {}
			})
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
		setSelectedTableType('protocols')
		setSelectedDatasetChain(null)
		setSelectedDatasetTimeframe(null)
		setSelectedTokens([])
		setIncludeCex(false)
		setChartBuilderName('')
		setChartBuilder({
			metric: 'tvl',
			chains: [],
			categories: [],
			groupBy: 'protocol',
			limit: 10,
			chartType: 'stackedArea',
			displayAs: 'timeSeries',
			additionalFilters: {}
		})
	}

	const state: ModalState = {
		selectedMainTab,
		selectedChartTab,
		composerItems,
		selectedChain,
		selectedChains,
		selectedProtocol,
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
		chartBuilder
	}

	const actionsObj = useMemo(
		() => ({
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
			setChartBuilder
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
			setChartBuilder
		]
	)

	return {
		state,
		actions: actionsObj,
		resetState
	}
}
