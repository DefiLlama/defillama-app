import { useMemo } from 'react'
import { useProDashboard } from '../../ProDashboardAPIContext'
import {
	Chain,
	CHART_TYPES,
	ChartConfig,
	DashboardItemConfig,
	MultiChartConfig,
	Protocol,
	ProtocolsTableConfig,
	TextConfig
} from '../../types'
import { ChartTabType, MainTabType } from './types'
import { useModalState } from './useModalState'

export function useModalActions(
	editItem: DashboardItemConfig | null | undefined,
	isOpen: boolean,
	onClose: () => void
) {
	const {
		protocols,
		chains,
		protocolsLoading,
		timePeriod,
		handleAddChart,
		handleAddTable,
		handleAddMultiChart,
		handleAddText,
		handleAddChartBuilder,
		handleEditItem
	} = useProDashboard()

	const { state, actions, resetState } = useModalState(editItem, isOpen)

	const selectedProtocolData = useMemo(
		() => protocols.find((p: Protocol) => p.slug === state.selectedProtocol),
		[protocols, state.selectedProtocol]
	)

	const selectedChainData = useMemo(
		() => chains.find((c: Chain) => c.name === state.selectedChain),
		[chains, state.selectedChain]
	)

	const chainOptions = useMemo(
		() => [
			{ value: 'All', label: 'All Chains' },
			...chains.map((chain: Chain) => ({
				value: chain.name,
				label: chain.name
			}))
		],
		[chains]
	)

	const protocolOptions = useMemo(
		() =>
			protocols.map((protocol: Protocol) => ({
				value: protocol.slug,
				label: protocol.name,
				logo: protocol.logo
			})),
		[protocols]
	)

	const handleChainChange = (option: any) => {
		actions.setSelectedChain(option.value)
		actions.setSelectedProtocol(null)
		actions.setSelectedChartType('tvl')
	}

	const handleChainsChange = (options: any[]) => {
		const selectedValues = options ? options.map((option) => option.value) : []
		actions.setSelectedChains(selectedValues)
	}

	const handleProtocolChange = (option: any) => {
		actions.setSelectedProtocol(option.value)
		actions.setSelectedChain(null)
		actions.setSelectedChartType('tvl')
	}

	const handleDatasetChainChange = (option: any) => {
		actions.setSelectedDatasetChain(option.value)
	}

	const handleTokensChange = (tokens: string[]) => {
		if (tokens.length <= 4) {
			actions.setSelectedTokens(tokens)
		}
	}

	const handleAddToComposer = (typesToAdd?: string[]) => {
		const chartTypesToAdd = typesToAdd || state.selectedChartTypes
		let addedCount = 0

		if (state.selectedChartTab === 'chain' && state.selectedChain && chartTypesToAdd.length > 0) {
			const chain = chains.find((c: Chain) => c.name === state.selectedChain)

			const filteredTypes = chartTypesToAdd.filter((chartType) => {
				return !state.composerItems.some((item) => item.chain === state.selectedChain && item.type === chartType)
			})

			if (filteredTypes.length > 0) {
				const newCharts = filteredTypes.map((chartType) => ({
					id: `${state.selectedChain}-${chartType}-${Date.now()}-${Math.random()}`,
					kind: 'chart' as const,
					chain: state.selectedChain,
					type: chartType,
					grouping: 'day' as const,
					geckoId: ['chainMcap', 'chainPrice'].includes(chartType) ? chain?.gecko_id : undefined
				}))
				actions.setComposerItems((prev) => [...prev, ...newCharts])
				addedCount = filteredTypes.length
			}
		} else if (state.selectedChartTab === 'protocol' && state.selectedProtocol && chartTypesToAdd.length > 0) {
			const protocol = protocols.find((p: Protocol) => p.slug === state.selectedProtocol)

			const filteredTypes = chartTypesToAdd.filter((chartType) => {
				return !state.composerItems.some((item) => item.protocol === state.selectedProtocol && item.type === chartType)
			})

			if (filteredTypes.length > 0) {
				const newCharts = filteredTypes.map((chartType) => ({
					id: `${state.selectedProtocol}-${chartType}-${Date.now()}-${Math.random()}`,
					kind: 'chart' as const,
					protocol: state.selectedProtocol,
					chain: '',
					type: chartType,
					grouping: 'day' as const,
					geckoId: protocol?.geckoId
				}))
				actions.setComposerItems((prev) => [...prev, ...newCharts])
				addedCount = filteredTypes.length
			}
		}
	}

	const handleRemoveFromComposer = (id: string) => {
		actions.setComposerItems((prev) => prev.filter((item) => item.id !== id))
	}

	const handleMainTabChange = (tab: MainTabType) => {
		actions.setSelectedMainTab(tab)
		actions.setSelectedChain(null)
		actions.setSelectedProtocol(null)
		actions.setSelectedChartType('tvl')
		actions.setSelectedChartTypes([])
		if (tab === 'charts') {
			actions.setUnifiedChartName('')
			actions.setChartCreationMode('separate')
		}
	}

	const handleChartTabChange = (tab: ChartTabType) => {
		actions.setSelectedChartTab(tab)
		actions.setSelectedChain(null)
		actions.setSelectedProtocol(null)
		actions.setSelectedChartType('tvl')
	}

	const updateChartBuilder = (updates: Partial<typeof state.chartBuilder>) => {
		actions.setChartBuilder((prev) => ({ ...prev, ...updates }))
	}

	const handleSubmit = () => {
		if (editItem) {
			let newItem: DashboardItemConfig | null = null

			if (
				state.selectedMainTab === 'charts' &&
				state.chartCreationMode === 'combined' &&
				state.composerItems.length > 0
			) {
				newItem = {
					...editItem,
					kind: 'multi',
					name: state.unifiedChartName.trim() || undefined,
					items: state.composerItems
				} as MultiChartConfig
			} else if (state.selectedMainTab === 'charts' && state.selectedChartTab === 'chain' && state.selectedChain) {
				const chain = chains.find((c: Chain) => c.name === state.selectedChain)
				const chartType = state.selectedChartTypes[0] || state.selectedChartType
				const chartTypeDetails = CHART_TYPES[chartType]
				newItem = {
					...editItem,
					kind: 'chart',
					chain: state.selectedChain,
					protocol: undefined,
					type: chartType,
					grouping: chartTypeDetails?.groupable ? 'day' : undefined,
					geckoId: ['chainMcap', 'chainPrice'].includes(chartType) ? chain?.gecko_id : undefined
				} as ChartConfig
			} else if (
				state.selectedMainTab === 'charts' &&
				state.selectedChartTab === 'protocol' &&
				state.selectedProtocol
			) {
				const protocol = protocols.find((p: Protocol) => p.slug === state.selectedProtocol)
				const chartType = state.selectedChartTypes[0] || state.selectedChartType
				const chartTypeDetails = CHART_TYPES[chartType]
				newItem = {
					...editItem,
					kind: 'chart',
					chain: '',
					protocol: state.selectedProtocol,
					type: chartType,
					grouping: chartTypeDetails?.groupable ? 'day' : undefined,
					geckoId: protocol?.geckoId
				} as ChartConfig
			} else if (state.selectedMainTab === 'table') {
				if (state.selectedTableType === 'protocols' && state.selectedChains.length > 0) {
					newItem = {
						...editItem,
						kind: 'table',
						tableType: 'protocols',
						chains: state.selectedChains
					} as ProtocolsTableConfig
				} else if (state.selectedTableType === 'stablecoins' && state.selectedDatasetChain) {
					newItem = {
						...editItem,
						kind: 'table',
						tableType: 'dataset',
						datasetType: 'stablecoins',
						datasetChain: state.selectedDatasetChain,
						chains: [state.selectedDatasetChain]
					} as ProtocolsTableConfig
				} else if (state.selectedTableType === 'cex') {
					newItem = {
						...editItem,
						kind: 'table',
						tableType: 'dataset',
						datasetType: 'cex',
						chains: []
					} as ProtocolsTableConfig
				} else if (state.selectedTableType === 'revenue') {
					newItem = {
						...editItem,
						kind: 'table',
						tableType: 'dataset',
						datasetType: 'revenue',
						chains: state.selectedChains
					} as ProtocolsTableConfig
				} else if (state.selectedTableType === 'holders-revenue') {
					newItem = {
						...editItem,
						kind: 'table',
						tableType: 'dataset',
						datasetType: 'holders-revenue',
						chains: state.selectedChains
					} as ProtocolsTableConfig
				} else if (state.selectedTableType === 'earnings') {
					newItem = {
						...editItem,
						kind: 'table',
						tableType: 'dataset',
						datasetType: 'earnings',
						chains: state.selectedChains
					} as ProtocolsTableConfig
				} else if (state.selectedTableType === 'fees') {
					newItem = {
						...editItem,
						kind: 'table',
						tableType: 'dataset',
						datasetType: 'fees',
						chains: state.selectedChains
					} as ProtocolsTableConfig
				} else if (state.selectedTableType === 'token-usage') {
					newItem = {
						...editItem,
						kind: 'table',
						tableType: 'dataset',
						datasetType: 'token-usage',
						chains: [],
						tokenSymbols: state.selectedTokens,
						includeCex: state.includeCex
					} as ProtocolsTableConfig
				} else if (state.selectedTableType === 'yields') {
					newItem = {
						...editItem,
						kind: 'table',
						tableType: 'dataset',
						datasetType: 'yields',
						chains: state.selectedChains
					} as ProtocolsTableConfig
				} else if (state.selectedTableType === 'aggregators') {
					newItem = {
						...editItem,
						kind: 'table',
						tableType: 'dataset',
						datasetType: 'aggregators',
						chains: state.selectedChains
					} as ProtocolsTableConfig
				} else if (state.selectedTableType === 'perps') {
					newItem = {
						...editItem,
						kind: 'table',
						tableType: 'dataset',
						datasetType: 'perps',
						chains: state.selectedChains
					} as ProtocolsTableConfig
				} else if (state.selectedTableType === 'options') {
					newItem = {
						...editItem,
						kind: 'table',
						tableType: 'dataset',
						datasetType: 'options',
						chains: state.selectedChains
					} as ProtocolsTableConfig
				} else if (state.selectedTableType === 'dexs') {
					newItem = {
						...editItem,
						kind: 'table',
						tableType: 'dataset',
						datasetType: 'dexs',
						chains: state.selectedChains
					} as ProtocolsTableConfig
				} else if (state.selectedTableType === 'bridge-aggregators') {
					newItem = {
						...editItem,
						kind: 'table',
						tableType: 'dataset',
						datasetType: 'bridge-aggregators',
						chains: state.selectedChains
					} as ProtocolsTableConfig
				} else if (state.selectedTableType === 'trending-contracts' && state.selectedDatasetChain) {
					newItem = {
						...editItem,
						kind: 'table',
						tableType: 'dataset',
						datasetType: 'trending-contracts',
						datasetChain: state.selectedDatasetChain,
						datasetTimeframe: state.selectedDatasetTimeframe || '1d',
						chains: [state.selectedDatasetChain]
					} as ProtocolsTableConfig
				} else if (state.selectedTableType === 'chains') {
					newItem = {
						...editItem,
						kind: 'table',
						tableType: 'dataset',
						datasetType: 'chains',
						datasetChain: state.selectedDatasetChain,
						chains: []
					} as ProtocolsTableConfig
				}
			} else if (state.selectedMainTab === 'text' && state.textContent.trim()) {
				newItem = {
					...editItem,
					kind: 'text',
					title: state.textTitle.trim() || undefined,
					content: state.textContent.trim()
				} as TextConfig
			} else if (state.selectedMainTab === 'builder' && state.chartBuilder.chains.length > 0) {
				newItem = {
					...editItem,
					kind: 'builder',
					name: state.chartBuilderName.trim() || undefined,
					config: state.chartBuilder
				}
			}

			if (newItem) {
				handleEditItem(editItem.id, newItem)
			}
		} else {
			if (state.selectedMainTab === 'charts') {
				if (state.composerItems.length > 0) {
					if (state.chartCreationMode === 'combined') {
						handleAddMultiChart(state.composerItems, state.unifiedChartName.trim() || undefined)
					} else {
						state.composerItems.forEach((item) => {
							if (item.chain) {
								handleAddChart(item.chain, item.type, 'chain', item.geckoId)
							} else if (item.protocol) {
								handleAddChart(item.protocol, item.type, 'protocol', item.geckoId)
							}
						})
					}
				} else if (state.chartCreationMode === 'separate' && state.selectedChartTypes.length > 0) {
					if (state.selectedChain) {
						const chain = chains.find((c: Chain) => c.name === state.selectedChain)
						state.selectedChartTypes.forEach((chartType) => {
							const geckoId = ['chainMcap', 'chainPrice'].includes(chartType) ? chain?.gecko_id : undefined
							handleAddChart(state.selectedChain, chartType, 'chain', geckoId)
						})
					} else if (state.selectedProtocol) {
						const protocol = protocols.find((p: Protocol) => p.slug === state.selectedProtocol)
						state.selectedChartTypes.forEach((chartType) => {
							handleAddChart(state.selectedProtocol, chartType, 'protocol', protocol?.geckoId)
						})
					}
				}
			} else if (state.selectedMainTab === 'table') {
				if (state.selectedTableType === 'protocols' && state.selectedChains.length > 0) {
					handleAddTable(state.selectedChains, 'protocols')
				} else if (state.selectedTableType === 'cex') {
					handleAddTable([], 'dataset', 'cex')
				} else if (state.selectedTableType === 'stablecoins' && state.selectedDatasetChain) {
					handleAddTable([state.selectedDatasetChain], 'dataset', 'stablecoins', state.selectedDatasetChain)
				} else if (state.selectedTableType === 'revenue') {
					handleAddTable(state.selectedChains, 'dataset', 'revenue')
				} else if (state.selectedTableType === 'holders-revenue') {
					handleAddTable(state.selectedChains, 'dataset', 'holders-revenue')
				} else if (state.selectedTableType === 'earnings') {
					handleAddTable(state.selectedChains, 'dataset', 'earnings')
				} else if (state.selectedTableType === 'fees') {
					handleAddTable(state.selectedChains, 'dataset', 'fees')
				} else if (state.selectedTableType === 'token-usage' && state.selectedTokens.length > 0) {
					handleAddTable([], 'dataset', 'token-usage', undefined, state.selectedTokens, state.includeCex)
				} else if (state.selectedTableType === 'yields') {
					handleAddTable(state.selectedChains, 'dataset', 'yields')
				} else if (state.selectedTableType === 'aggregators') {
					handleAddTable(state.selectedChains, 'dataset', 'aggregators')
				} else if (state.selectedTableType === 'perps') {
					handleAddTable(state.selectedChains, 'dataset', 'perps')
				} else if (state.selectedTableType === 'options') {
					handleAddTable(state.selectedChains, 'dataset', 'options')
				} else if (state.selectedTableType === 'dexs') {
					handleAddTable(state.selectedChains, 'dataset', 'dexs')
				} else if (state.selectedTableType === 'bridge-aggregators') {
					handleAddTable(state.selectedChains, 'dataset', 'bridge-aggregators')
				} else if (state.selectedTableType === 'trending-contracts' && state.selectedDatasetChain) {
					handleAddTable(
						[state.selectedDatasetChain],
						'dataset',
						'trending-contracts',
						state.selectedDatasetChain,
						undefined,
						undefined,
						state.selectedDatasetTimeframe || '1d'
					)
				} else if (state.selectedTableType === 'chains') {
					handleAddTable([], 'dataset', 'chains', state.selectedDatasetChain)
				}
			} else if (state.selectedMainTab === 'text' && state.textContent.trim()) {
				handleAddText(state.textTitle.trim() || undefined, state.textContent.trim())
			} else if (state.selectedMainTab === 'builder' && state.chartBuilder.chains.length > 0) {
				handleAddChartBuilder(state.chartBuilderName.trim() || undefined, state.chartBuilder)
			}
		}

		// Clean up state
		resetState()
		onClose()
	}

	return {
		state,
		actions: {
			...actions,
			handleChainChange,
			handleChainsChange,
			handleProtocolChange,
			handleDatasetChainChange,
			handleTokensChange,
			handleAddToComposer,
			handleRemoveFromComposer,
			handleMainTabChange,
			handleChartTabChange,
			handleSubmit,
			setChartBuilder: actions.setChartBuilder,
			updateChartBuilder
		},
		computed: {
			selectedProtocolData,
			selectedChainData,
			chainOptions,
			protocolOptions,
			protocolsLoading,
			timePeriod
		}
	}
}
