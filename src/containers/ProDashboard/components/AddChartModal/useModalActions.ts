import { useMemo } from 'react'
import { useProDashboard } from '../../ProDashboardAPIContext'
import { useModalState } from './useModalState'
import { sluggify } from '~/utils/cache-client'
import {
	DashboardItemConfig,
	ChartConfig,
	MultiChartConfig,
	ProtocolsTableConfig,
	TextConfig,
	CHART_TYPES,
	Protocol,
	Chain
} from '../../types'
import { MainTabType, ChartTabType } from './types'

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
		handleEditItem
	} = useProDashboard()

	const { state, actions, resetState } = useModalState(editItem, isOpen)

	const selectedProtocolData = useMemo(
		() => protocols.find((p: Protocol) => p.slug === state.selectedProtocol),
		[protocols, state.selectedProtocol]
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
				value: sluggify(protocol.name),
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
		const selectedValues = options ? options.map(option => option.value) : []
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

	const handleAddToComposer = () => {
		if (state.composerSubType === 'chain' && state.selectedChain) {
			const newChart: ChartConfig = {
				id: `${state.selectedChain}-${state.selectedChartType}-${Date.now()}`,
				kind: 'chart',
				chain: state.selectedChain,
				type: state.selectedChartType,
				grouping: 'day'
			}
			actions.setComposerItems((prev) => [...prev, newChart])
		} else if (state.composerSubType === 'protocol' && state.selectedProtocol) {
			const protocol = protocols.find((p: Protocol) => p.slug === state.selectedProtocol)
			const newChart: ChartConfig = {
				id: `${state.selectedProtocol}-${state.selectedChartType}-${Date.now()}`,
				kind: 'chart',
				protocol: state.selectedProtocol,
				chain: '',
				type: state.selectedChartType,
				grouping: 'day',
				geckoId: protocol?.geckoId
			}
			actions.setComposerItems((prev) => [...prev, newChart])
		}
		actions.setSelectedChain(null)
		actions.setSelectedProtocol(null)
		actions.setSelectedChartType('tvl')
	}

	const handleRemoveFromComposer = (id: string) => {
		actions.setComposerItems((prev) => prev.filter((item) => item.id !== id))
	}

	const handleMainTabChange = (tab: MainTabType) => {
		actions.setSelectedMainTab(tab)
		actions.setSelectedChain(null)
		actions.setSelectedProtocol(null)
		actions.setSelectedChartType('tvl')
	}

	const handleChartTabChange = (tab: ChartTabType) => {
		actions.setSelectedChartTab(tab)
		actions.setSelectedChain(null)
		actions.setSelectedProtocol(null)
		actions.setSelectedChartType('tvl')
	}

	const handleComposerSubTypeChange = (type: ChartTabType) => {
		actions.setComposerSubType(type)
		actions.setSelectedChain(null)
		actions.setSelectedProtocol(null)
		actions.setSelectedChartType('tvl')
	}

	const handleSubmit = () => {
		if (editItem) {
			// Edit mode - create new item with same ID and update in place
			let newItem: DashboardItemConfig | null = null

			if (state.selectedMainTab === 'composer' && state.composerItems.length > 0) {
				newItem = {
					...editItem,
					kind: 'multi',
					name: state.composerChartName.trim() || undefined,
					items: state.composerItems
				} as MultiChartConfig
			} else if (state.selectedMainTab === 'chart' && state.selectedChartTab === 'chain' && state.selectedChain) {
				const chartTypeDetails = CHART_TYPES[state.selectedChartType]
				newItem = {
					...editItem,
					kind: 'chart',
					chain: state.selectedChain,
					protocol: undefined,
					type: state.selectedChartType,
					grouping: chartTypeDetails?.groupable ? 'day' : undefined,
					geckoId: undefined
				} as ChartConfig
			} else if (state.selectedMainTab === 'chart' && state.selectedChartTab === 'protocol' && state.selectedProtocol) {
				const protocol = protocols.find((p: Protocol) => p.slug === state.selectedProtocol)
				const chartTypeDetails = CHART_TYPES[state.selectedChartType]
				newItem = {
					...editItem,
					kind: 'chart',
					chain: '',
					protocol: state.selectedProtocol,
					type: state.selectedChartType,
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
				}
			} else if (state.selectedMainTab === 'text' && state.textContent.trim()) {
				newItem = {
					...editItem,
					kind: 'text',
					title: state.textTitle.trim() || undefined,
					content: state.textContent.trim()
				} as TextConfig
			}

			if (newItem) {
				handleEditItem(editItem.id, newItem)
			}
		} else {
			// Add mode - use existing handlers
			if (state.selectedMainTab === 'composer' && state.composerItems.length > 0) {
				handleAddMultiChart(state.composerItems, state.composerChartName.trim() || undefined)
			} else if (state.selectedMainTab === 'chart' && state.selectedChartTab === 'chain' && state.selectedChain) {
				handleAddChart(state.selectedChain, state.selectedChartType, 'chain')
			} else if (state.selectedMainTab === 'chart' && state.selectedChartTab === 'protocol' && state.selectedProtocol) {
				const protocol = protocols.find((p: Protocol) => p.slug === state.selectedProtocol)
				handleAddChart(state.selectedProtocol, state.selectedChartType, 'protocol', protocol?.geckoId)
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
				}
			} else if (state.selectedMainTab === 'text' && state.textContent.trim()) {
				handleAddText(state.textTitle.trim() || undefined, state.textContent.trim())
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
			handleAddToComposer,
			handleRemoveFromComposer,
			handleMainTabChange,
			handleChartTabChange,
			handleComposerSubTypeChange,
			handleSubmit
		},
		computed: {
			selectedProtocolData,
			chainOptions,
			protocolOptions,
			protocolsLoading,
			timePeriod
		}
	}
}
