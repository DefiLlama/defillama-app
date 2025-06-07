import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { QueryObserverResult } from '@tanstack/react-query'
import {
	ChartConfig,
	CHART_TYPES,
	DashboardItemConfig,
	ProtocolsTableConfig,
	MultiChartConfig,
	TextConfig,
	Chain
} from './types'
import { useChartsData, useProtocolsAndChains } from './queries'
import { groupData } from './utils'
import { Protocol } from './types'
import { useLocalStorageContext, PRO_DASHBOARD_ITEMS } from '~/contexts/LocalStorage'

export type TimePeriod = '30d' | '90d' | '365d' | 'all'

interface ProDashboardContextType {
	items: DashboardItemConfig[]
	chartsWithData: DashboardItemConfig[]
	protocols: Protocol[]
	chains: Chain[]
	protocolsLoading: boolean
	timePeriod: TimePeriod
	dashboardName: string
	setTimePeriod: (period: TimePeriod) => void
	setDashboardName: (name: string) => void
	handleAddChart: (item: string, chartType: string, itemType: 'chain' | 'protocol', geckoId?: string | null) => void
	handleAddTable: (chain: string) => void
	handleAddMultiChart: (chartItems: ChartConfig[], name?: string) => void
	handleAddText: (title: string | undefined, content: string) => void
	handleRemoveItem: (itemId: string) => void
	handleChartsReordered: (newCharts: DashboardItemConfig[]) => void
	handleGroupingChange: (chartId: string, newGrouping: 'day' | 'week' | 'month') => void
	handleColSpanChange: (chartId: string, newColSpan: 1 | 2) => void
	getChainInfo: (chainName: string) => Chain | undefined
	getProtocolInfo: (protocolId: string) => Protocol | undefined
}

const ProDashboardContext = createContext<ProDashboardContextType | undefined>(undefined)

export function ProDashboardProvider({ children }: { children: ReactNode }) {
	const { data: { protocols = [], chains: rawChains = [] } = {}, isLoading: protocolsLoading } = useProtocolsAndChains()

	const chains: Chain[] = rawChains
	const [items, setItems] = useState<DashboardItemConfig[]>([])
	const [timePeriod, setTimePeriod] = useState<TimePeriod>('all')
	const [dashboardName, setDashboardName] = useState<string>('My Dashboard')
	const [localStorageState, { updateKey }] = useLocalStorageContext()

	useEffect(() => {
		const savedData = localStorageState?.[PRO_DASHBOARD_ITEMS]
		if (savedData) {
			if (savedData.items && Array.isArray(savedData.items) && savedData.items.length > 0) {
				setItems(savedData.items)
			}
			if (savedData.dashboardName && typeof savedData.dashboardName === 'string') {
				setDashboardName(savedData.dashboardName)
			}
		} else if (Array.isArray(savedData) && savedData.length > 0) {
			setItems(savedData)
		}
	}, [localStorageState])

	useEffect(() => {
		const itemsToSave = items.map((item) => {
			if (item.kind === 'chart') {
				const { data, isLoading, hasError, refetch, ...chartConfigToSave } = item as ChartConfig
				return chartConfigToSave
			} else if (item.kind === 'table') {
				return item as ProtocolsTableConfig
			} else if (item.kind === 'text') {
				return item as TextConfig
			} else if (item.kind === 'multi') {
				const { items: nestedItems, ...rest } = item as MultiChartConfig
				const cleanNestedItems = nestedItems.map((nestedItem) => {
					const { data, isLoading, hasError, refetch, ...cleanItem } = nestedItem
					return cleanItem
				})
				return { ...rest, items: cleanNestedItems }
			}
			return item
		})

		const dataToSave = {
			items: itemsToSave,
			dashboardName
		}

		const currentlySavedDataString = JSON.stringify(localStorageState?.[PRO_DASHBOARD_ITEMS] || {})
		const dataToSaveString = JSON.stringify(dataToSave)

		if (dataToSaveString !== currentlySavedDataString) {
			updateKey(PRO_DASHBOARD_ITEMS, dataToSave)
		}
	}, [items, dashboardName, localStorageState, updateKey])

	const allChartItems: ChartConfig[] = []
	items.forEach((item) => {
		if (item.kind === 'chart') {
			allChartItems.push(item)
		} else if (item.kind === 'multi') {
			allChartItems.push(...item.items)
		}
	})

	const chartQueries = useChartsData(allChartItems, timePeriod)

	const chartsWithData: DashboardItemConfig[] = items.map((item) => {
		if (item.kind === 'chart') {
			const chart = item
			const idx = allChartItems.findIndex((c) => c.id === chart.id)
			const query = chartQueries[idx] || ({} as QueryObserverResult<any, Error>)
			const chartTypeDetails = CHART_TYPES[chart.type]
			let processedData = query.data || []
			if (chartTypeDetails?.groupable) {
				processedData = groupData(query.data, chart.grouping)
			}
			return {
				...chart,
				data: processedData,
				isLoading: query.isLoading || false,
				hasError: query.isError || false,
				refetch: query.refetch || (() => {})
			}
		} else if (item.kind === 'multi') {
			const processedItems = item.items.map((nestedChart) => {
				const idx = allChartItems.findIndex((c) => c.id === nestedChart.id)
				const query = chartQueries[idx] || ({} as QueryObserverResult<any, Error>)
				const chartTypeDetails = CHART_TYPES[nestedChart.type]
				let processedData = query.data || []
				if (chartTypeDetails?.groupable) {
					processedData = groupData(query.data, nestedChart.grouping)
				}
				return {
					...nestedChart,
					data: processedData,
					isLoading: query.isLoading || false,
					hasError: query.isError || false,
					refetch: query.refetch || (() => {})
				}
			})
			return {
				...item,
				items: processedItems
			}
		}
		return item
	})

	useEffect(() => {
		if (chains.length > 0) {
			const topChainName = chains[0].name
			if (items.length === 0) {
				const initialCharts: DashboardItemConfig[] = [
					{ id: `${topChainName}-tvl`, kind: 'chart', chain: topChainName, type: 'tvl', colSpan: 1 },
					{
						id: `${topChainName}-volume`,
						kind: 'chart',
						chain: topChainName,
						type: 'volume',
						grouping: 'day',
						colSpan: 1
					},
					{ id: `${topChainName}-fees`, kind: 'chart', chain: topChainName, type: 'fees', grouping: 'day', colSpan: 1 }
				]
				setItems(initialCharts)
			}
		}
	}, [chains, items.length])

	const handleAddChart = (item: string, chartType: string, itemType: 'chain' | 'protocol', geckoId?: string | null) => {
		const newChartId = `${item}-${chartType}-${Date.now()}`
		const chartTypeDetails = CHART_TYPES[chartType]

		const newChartBase: Partial<ChartConfig> = {
			id: newChartId,
			kind: 'chart',
			type: chartType,
			colSpan: 1
		}

		if (chartTypeDetails?.groupable) {
			newChartBase.grouping = 'day'
		}

		let newChart: ChartConfig
		if (itemType === 'protocol') {
			newChart = {
				...newChartBase,
				protocol: item,
				chain: '',
				geckoId
			} as ChartConfig
		} else {
			newChart = {
				...newChartBase,
				chain: item
			} as ChartConfig
		}

		setItems((prev) => [...prev, newChart])
	}

	const handleAddTable = (chain: string) => {
		const newTable: ProtocolsTableConfig = {
			id: `table-${chain}-${Date.now()}`,
			kind: 'table',
			chain,
			colSpan: 2
		}
		setItems((prev) => [...prev, newTable])
	}

	const handleAddMultiChart = (chartItems: ChartConfig[], name?: string) => {
		const newMultiChart: MultiChartConfig = {
			id: `multi-${Date.now()}`,
			kind: 'multi',
			name: name || `Multi-Chart ${items.filter((item) => item.kind === 'multi').length + 1}`,
			items: chartItems,
			grouping: 'day',
			colSpan: 1
		}
		setItems((prev) => [...prev, newMultiChart])
	}

	const handleAddText = (title: string | undefined, content: string) => {
		const newText: TextConfig = {
			id: `text-${Date.now()}`,
			kind: 'text',
			title,
			content,
			colSpan: 1
		}
		setItems((prev) => [...prev, newText])
	}

	const handleRemoveItem = (itemId: string) => {
		setItems((prev) => prev.filter((item) => item.id !== itemId))
	}

	const handleChartsReordered = (newCharts: DashboardItemConfig[]) => {
		setItems(newCharts)
	}

	const handleGroupingChange = (chartId: string, newGrouping: 'day' | 'week' | 'month') => {
		setItems((prev) =>
			prev.map((item) => {
				if (item.id === chartId && item.kind === 'chart') {
					return { ...item, grouping: newGrouping }
				} else if (item.kind === 'multi' && item.id === chartId) {
					return { ...item, grouping: newGrouping }
				}
				return item
			})
		)
	}

	const handleColSpanChange = (chartId: string, newColSpan: 1 | 2) => {
		setItems((prev) =>
			prev.map((item) => {
				if (item.id === chartId) {
					return { ...item, colSpan: newColSpan }
				}
				return item
			})
		)
	}

	const getChainInfo = (chainName: string) => {
		return chains.find((chain) => chain.name === chainName)
	}

	const getProtocolInfo = (protocolId: string) => {
		return protocols.find((p: Protocol) => p.slug === protocolId)
	}

	const value: ProDashboardContextType = {
		items,
		chartsWithData,
		protocols,
		chains,
		protocolsLoading,
		timePeriod,
		dashboardName,
		setTimePeriod,
		setDashboardName,
		handleAddChart,
		handleAddTable,
		handleAddMultiChart,
		handleAddText,
		handleRemoveItem,
		handleChartsReordered,
		handleGroupingChange,
		handleColSpanChange,
		getChainInfo,
		getProtocolInfo
	}

	return <ProDashboardContext.Provider value={value}>{children}</ProDashboardContext.Provider>
}

export function useProDashboard() {
	const context = useContext(ProDashboardContext)
	if (context === undefined) {
		throw new Error('useProDashboard must be used within a ProDashboardProvider')
	}
	return context
}
