import { useState, useEffect } from 'react'
import { Icon } from '~/components/Icon'
import { ChartConfig, CHART_TYPES, DashboardItemConfig, ProtocolsTableConfig } from './types'
import { AddChartModal } from './components/AddChartModal'
import { ChartGrid } from './components/ChartGrid'
import { EmptyState } from './components/EmptyState'
import { useChartsData, useProtocolsAndChains } from './queries'
import { QueryObserverResult } from '@tanstack/react-query'
import { groupData } from './utils'
import { Protocol } from './types'
import { useRouter } from 'next/router'
import { SubscribePlusCard } from '~/components/SubscribeCards/SubscribePlusCard'
import { useSubscribe } from '~/hooks/useSubscribe'
import { useLocalStorageContext, PRO_DASHBOARD_ITEMS } from '~/contexts/LocalStorage'

export default function ProDashboard() {
	const { data: { protocols = [], chains = [] } = {}, isLoading: protocolsLoading } = useProtocolsAndChains()
	const [showAddModal, setShowAddModal] = useState<boolean>(false)
	const [items, setItems] = useState<DashboardItemConfig[]>([])
	const { subscription, isLoading: isSubLoading } = useSubscribe()
	const router = useRouter()
	const [localStorageState, { updateKey }] = useLocalStorageContext()

	useEffect(() => {
		const savedItems = localStorageState?.[PRO_DASHBOARD_ITEMS]
		if (savedItems && Array.isArray(savedItems) && savedItems.length > 0) {
			setItems(savedItems)
		}
	}, [localStorageState])

	useEffect(() => {
		const itemsToSave = items.map((item) => {
			if (item.kind === 'chart') {
				const { data, isLoading, hasError, refetch, ...chartConfigToSave } = item as ChartConfig
				return chartConfigToSave
			} else if (item.kind === 'table') {
				return item as ProtocolsTableConfig
			}
			return item
		})

		const currentlySavedItemsString = JSON.stringify(localStorageState?.[PRO_DASHBOARD_ITEMS] || [])
		const itemsToSaveString = JSON.stringify(itemsToSave)

		if (itemsToSaveString !== currentlySavedItemsString) {
			updateKey(PRO_DASHBOARD_ITEMS, itemsToSave)
		}
	}, [items, localStorageState, updateKey])

	const chartItems = items.filter((item) => item.kind === 'chart') as ChartConfig[]
	const chartQueries = useChartsData(chartItems)

	const chartsWithData: DashboardItemConfig[] = items.map((item) => {
		if (item.kind === 'chart') {
			const chart = item
			const idx = chartItems.findIndex((c) => c.id === chart.id)
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
		}
		return item
	})

	useEffect(() => {
		if (chains.length > 0) {
			const topChainName = chains[0].name
			if (items.length === 0) {
				const initialCharts: DashboardItemConfig[] = [
					{ id: `${topChainName}-tvl`, kind: 'chart', chain: topChainName, type: 'tvl' },
					{ id: `${topChainName}-volume`, kind: 'chart', chain: topChainName, type: 'volume', grouping: 'day' },
					{ id: `${topChainName}-fees`, kind: 'chart', chain: topChainName, type: 'fees', grouping: 'day' }
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
			type: chartType
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
			chain
		}
		setItems((prev) => [...prev, newTable])
	}

	const handleRemoveChart = (chartId: string) => {
		setItems((prev) => prev.filter((item) => item.id !== chartId))
	}

	const handleChartsReordered = (newCharts: ChartConfig[]) => {
		setItems(newCharts)
	}

	const getChainInfo = (chainName: string) => {
		return chains.find((chain) => chain.name === chainName)
	}

	const getProtocolInfo = (protocolId: string) => {
		return protocols.find((p: Protocol) => p.slug === protocolId)
	}

	if (isSubLoading) {
		return (
			<div className="flex justify-center items-center h-[40vh]">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary1)]"></div>
			</div>
		)
	}

	if (subscription?.status !== 'active') {
		return (
			<div className="flex flex-col items-center justify-center w-full px-4 py-10">
				<div className="mb-10 text-center w-full max-w-3xl">
					<h2 className="text-3xl font-extrabold text-white mb-3">Unlock the Full Picture</h2>
					<p className="text-[#b4b7bc] text-lg mb-4">
						The Pro Dashboard offers dynamic, customizable charts. Here's a sneak peek of what you can explore with a
						Llama+ subscription:
					</p>
				</div>

				<SubscribePlusCard context="modal" />
			</div>
		)
	}

	return (
		<div className="p-4 md:p-6">
			<div className="flex justify-end items-center mb-6">
				<button
					className="px-4 py-2 rounded-md bg-[var(--primary1)] text-white flex items-center gap-2 hover:bg-[var(--primary1-hover)]"
					onClick={() => setShowAddModal(true)}
				>
					<Icon name="plus" height={16} width={16} />
					Add Item
				</button>
			</div>

			{protocolsLoading && items.length === 0 && (
				<div className="flex items-center justify-center h-40">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary1)]"></div>
				</div>
			)}

			{items.length > 0 && (
				<ChartGrid
					charts={chartsWithData}
					onChartsReordered={handleChartsReordered}
					onRemoveChart={handleRemoveChart}
					getChainInfo={getChainInfo}
					getProtocolInfo={getProtocolInfo}
					onGroupingChange={(chartId: string, newGrouping: 'day' | 'week' | 'month') => {
						setItems((prev) =>
							prev.map((c) => (c.id === chartId && c.kind === 'chart' ? { ...c, grouping: newGrouping } : c))
						)
					}}
					onAddChartClick={() => setShowAddModal(true)}
				/>
			)}

			<AddChartModal
				isOpen={showAddModal}
				onClose={() => setShowAddModal(false)}
				onAddChart={handleAddChart}
				onAddTable={handleAddTable}
				chains={chains}
				chainsLoading={protocolsLoading}
			/>

			{!protocolsLoading && items.length === 0 && <EmptyState onAddChart={() => setShowAddModal(true)} />}
		</div>
	)
}
