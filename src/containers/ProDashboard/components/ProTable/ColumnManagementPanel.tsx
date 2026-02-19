'use no memo'

import * as React from 'react'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import type { CustomView } from '../../types'
import { CustomColumnPanel } from './CustomColumnPanel'
import { SHARE_METRIC_DEFINITIONS } from './proTable.constants'
import { protocolsByChainTableColumns, TABLE_CATEGORIES } from './useProTableColumns'

const EMPTY_CUSTOM_COLUMNS: CustomColumn[] = []
const EMPTY_CUSTOM_VIEWS: CustomView[] = []

const metricDescriptions: Record<string, string> = {
	name: 'Protocol name',
	category: 'Protocol category or type',
	oracles: 'Oracles that secure the protocol',
	tvl: 'Total Value Locked - The total USD value of assets deposited in the protocol',
	change_1d: '24-hour percentage change in TVL',
	change_7d: '7-day percentage change in TVL',
	change_1m: '30-day percentage change in TVL',
	mcap: 'Market capitalization of the protocol token',
	mcaptvl: 'Market Capitalization to TVL ratio',
	fees_24h: 'Total fees generated in the last 24 hours',
	fees_7d: 'Total fees generated in the last 7 days',
	fees_30d: 'Total fees generated in the last 30 days',
	fees_1y: 'Total fees generated in the last 12 months',
	average_1y: 'Average monthly fees over the past year',
	feesChange_1d: 'Day-over-day percentage change in fees',
	feesChange_7d: 'Week-over-week percentage change in fees',
	feesChange_1m: 'Month-over-month percentage change in fees',
	feesChange_7dover7d: 'Change of last 7d fees over the previous 7d fees',
	feesChange_30dover30d: 'Change of last 30d fees over the previous 30d fees',
	revenue_24h: 'Total revenue generated in the last 24 hours',
	revenue_7d: 'Total revenue generated in the last 7 days',
	revenue_30d: 'Total revenue generated in the last 30 days',
	revenue_1y: 'Total revenue generated in the past year',
	average_revenue_1y: 'Average monthly revenue over the past year',
	revenueChange_1d: 'Day-over-day percentage change in revenue',
	revenueChange_7d: 'Week-over-week percentage change in revenue',
	revenueChange_1m: 'Month-over-month percentage change in revenue',
	revenueChange_7dover7d: 'Change of last 7d revenue over the previous 7d revenue',
	revenueChange_30dover30d: 'Change of last 30d revenue over the previous 30d revenue',
	userFees_24h: 'Fees paid by users in the last 24 hours',
	cumulativeFees: 'Total cumulative fees generated since inception',
	holderRevenue_24h: 'Revenue distributed to token holders in the last 24 hours',
	holdersRevenue30d: 'Revenue distributed to token holders in the last 30 days',
	treasuryRevenue_24h: 'Revenue going to protocol treasury in the last 24 hours',
	supplySideRevenue_24h: 'Revenue distributed to liquidity providers in the last 24 hours',
	ps: 'Price to Sales ratio - Market cap divided by annualized revenue',
	pf: 'Price to Fees ratio - Market cap divided by annualized fees',
	volume_24h: 'Spot trading volume in the last 24 hours',
	volume_7d: 'Spot trading volume in the last 7 days',
	volume_30d: 'Spot trading volume in the last 30 days',
	volumeChange_1d: 'Day-over-day percentage change in spot trading volume',
	volumeChange_7d: '7-day percentage change in spot trading volume',
	volumeChange_1m: 'Month-over-month percentage change in spot trading volume',
	cumulativeVolume: 'Total cumulative trading volume since inception',
	volumeDominance_24h: 'Share of total 24h spot volume across tracked protocols',
	volumeMarketShare7d: 'Share of total 7d spot volume across tracked protocols',
	perps_volume_24h: 'Perpetuals trading volume in the last 24 hours',
	perps_volume_7d: 'Perpetuals trading volume in the last 7 days',
	perps_volume_30d: 'Perpetuals trading volume in the last 30 days',
	perps_volume_change_1d: 'Day-over-day percentage change in perps trading volume',
	perps_volume_change_7d: 'Change of last 7d perps volume over the previous 7d',
	perps_volume_change_1m: 'Month-over-month percentage change in perps trading volume',
	perps_volume_dominance_24h: 'Share of total 24h perpetuals volume across tracked protocols',
	openInterest: 'Total notional value of all open perpetual futures positions',
	holdersRevenueChange_30dover30d: 'Change of last 30d holders revenue over the previous 30d',
	tvl_share: 'Percentage of total TVL across all protocols',
	mcap_share: 'Percentage of total market cap across all protocols',
	fees_24h_share: 'Percentage of total 24h fees across all protocols',
	fees_7d_share: 'Percentage of total 7d fees across all protocols',
	fees_30d_share: 'Percentage of total 30d fees across all protocols',
	fees_1y_share: 'Percentage of total yearly fees across all protocols',
	average_1y_share: 'Percentage of average monthly fees across all protocols',
	revenue_24h_share: 'Percentage of total 24h revenue across all protocols',
	revenue_7d_share: 'Percentage of total 7d revenue across all protocols',
	revenue_30d_share: 'Percentage of total 30d revenue across all protocols',
	revenue_1y_share: 'Percentage of total yearly revenue across all protocols',
	volume_24h_share: 'Percentage of total 24h volume across all protocols',
	volume_7d_share: 'Percentage of total 7d volume across all protocols',
	cumulativeFees_share: 'Percentage of total cumulative fees across all protocols',
	cumulativeVolume_share: 'Percentage of total cumulative volume across all protocols'
}

interface CustomColumn {
	id: string
	name: string
	expression: string
	isValid: boolean
	errorMessage?: string
}

interface ColumnManagementPanelProps {
	showColumnPanel: boolean
	setShowColumnPanel: (show: boolean) => void
	searchTerm: string
	setSearchTerm: (term: string) => void
	currentColumns: Record<string, boolean>
	columnOrder: string[]
	addOption: (options: string[], setLocalStorage?: boolean) => void
	toggleColumnVisibility: (columnKey: string, isVisible: boolean) => void
	moveColumnUp?: (columnKey: string) => void
	moveColumnDown?: (columnKey: string) => void
	customColumns?: CustomColumn[]
	onAddCustomColumn?: (column: CustomColumn) => void
	onRemoveCustomColumn?: (columnId: string) => void
	onUpdateCustomColumn?: (columnId: string, updates: Partial<CustomColumn>) => void
	customViews?: CustomView[]
	onLoadView?: (viewId: string) => void
	onDeleteView?: (viewId: string) => void
	activeViewId?: string
}

interface ColumnListItem {
	key: string
	name: string
	category?: string
}

interface ColumnButtonProps {
	column: ColumnListItem
	isActive: boolean
	isCustom?: boolean
	currentColumns: Record<string, boolean>
	columnOrder: string[]
	moveColumnUp: (columnKey: string) => void
	moveColumnDown: (columnKey: string) => void
	toggleColumnVisibility: (columnKey: string, isVisible: boolean) => void
	customColumns: CustomColumn[]
}

// Helper component for column buttons
const ColumnButton = React.memo(function ColumnButton({
	column,
	isActive,
	isCustom,
	currentColumns,
	columnOrder,
	moveColumnUp,
	moveColumnDown,
	toggleColumnVisibility,
	customColumns
}: ColumnButtonProps) {
	const description = isCustom
		? customColumns.find((c) => c.id === column.key)?.expression || 'Custom column'
		: metricDescriptions[column.key] || ''

	if (isActive) {
		const visibleColumnsInOrder = columnOrder.filter((key) => currentColumns[key])
		const actualIndex = visibleColumnsInOrder.indexOf(column.key)
		const isFirst = actualIndex === 0
		const isLast = actualIndex === visibleColumnsInOrder.length - 1

		return (
			<Tooltip key={column.key} content={description} className="w-full">
				<div className="flex w-full items-center justify-between rounded-md border pro-divider pro-bg2 pro-hover-bg p-2 transition-colors">
					<div className="flex items-center gap-2">
						<Icon name="check" height={12} width={12} className="text-(--success)" />
						<span className="text-xs pro-text1">{column.name}</span>
						{isCustom && <span className="rounded-md bg-(--primary) px-1 py-0.5 text-xs text-white">Custom</span>}
						{column.key?.endsWith('_share') && (
							<span className="rounded-md bg-pro-blue-100 px-1 py-0.5 text-xs text-pro-blue-400 dark:bg-pro-blue-300/20 dark:text-pro-blue-200">
								%
							</span>
						)}
					</div>
					<div className="flex items-center gap-1">
						{moveColumnUp && !isFirst && (
							<button
								onClick={() => moveColumnUp(column.key)}
								className="rounded-md p-1 pro-text3 transition-colors hover:pro-text1"
								title="Move up"
							>
								<Icon name="chevron-up" height={10} width={10} />
							</button>
						)}
						{moveColumnDown && !isLast && (
							<button
								onClick={() => moveColumnDown(column.key)}
								className="rounded-md p-1 pro-text3 transition-colors hover:pro-text1"
								title="Move down"
							>
								<Icon name="chevron-down" height={10} width={10} />
							</button>
						)}
						<button
							onClick={() => toggleColumnVisibility(column.key, false)}
							className="rounded-md p-1 pro-text3 transition-colors hover:pro-text1"
						>
							<Icon name="x" height={12} width={12} />
						</button>
					</div>
				</div>
			</Tooltip>
		)
	}

	return (
		<Tooltip key={column.key} content={description}>
			<button
				onClick={() => toggleColumnVisibility(column.key, true)}
				className="flex w-full items-center gap-2 rounded-md border pro-divider pro-bg2 pro-hover-bg p-2 text-left transition-colors"
			>
				<Icon name="plus" height={10} width={10} className="pro-text3" />
				<span className="text-xs pro-text1">{column.name}</span>
				{column.key?.endsWith('_share') && (
					<span className="ml-auto rounded-md bg-pro-blue-100 px-1 py-0.5 text-xs text-pro-blue-400 dark:bg-pro-blue-300/20 dark:text-pro-blue-200">
						%
					</span>
				)}
			</button>
		</Tooltip>
	)
})

export function ColumnManagementPanel({
	showColumnPanel,
	setShowColumnPanel,
	searchTerm,
	setSearchTerm,
	currentColumns,
	columnOrder,
	addOption,
	toggleColumnVisibility,
	moveColumnUp,
	moveColumnDown,
	customColumns = EMPTY_CUSTOM_COLUMNS,
	onAddCustomColumn,
	onRemoveCustomColumn,
	onUpdateCustomColumn,
	customViews = EMPTY_CUSTOM_VIEWS,
	onLoadView,
	onDeleteView,
	activeViewId
}: ColumnManagementPanelProps) {
	const [activeTab, setActiveTab] = React.useState<'columns' | 'custom' | 'views'>('columns')

	// Filter columns by search term (including custom columns in standard tab)
	const filteredColumns = React.useMemo(() => {
		return protocolsByChainTableColumns.filter((column) => column.name.toLowerCase().includes(searchTerm.toLowerCase()))
	}, [searchTerm])

	const percentageShareColumns = React.useMemo(() => {
		return SHARE_METRIC_DEFINITIONS.map((metric) => ({
			key: `${metric.key}_share`,
			name: metric.name,
			category: 'PERCENTAGE_SHARE' as const
		}))
	}, [])

	// Custom columns formatted for the standard columns view
	const customColumnsForStandardView = React.useMemo(() => {
		return customColumns.map((customCol) => ({
			key: customCol.id,
			name: customCol.name + ' (Custom)',
			category: 'CUSTOM' as const
		}))
	}, [customColumns])

	// Combined columns for standard tab display
	const allColumnsForDisplay = React.useMemo(() => {
		return [...protocolsByChainTableColumns, ...percentageShareColumns, ...customColumnsForStandardView]
	}, [customColumnsForStandardView, percentageShareColumns])

	const columnsByKey = React.useMemo(() => {
		return new Map(allColumnsForDisplay.map((column) => [column.key, column]))
	}, [allColumnsForDisplay])

	const customColumnIdSet = React.useMemo(() => new Set(customColumns.map((column) => column.id)), [customColumns])

	const visibleColumnOrder = React.useMemo(() => {
		return columnOrder.filter((columnId) => currentColumns[columnId])
	}, [columnOrder, currentColumns])

	const visibleColumnCount = React.useMemo(() => {
		return Object.values(currentColumns).filter(Boolean).length
	}, [currentColumns])

	// Filter percentage share columns by search term
	const filteredPercentageColumns = React.useMemo(() => {
		return percentageShareColumns.filter((column) => column.name.toLowerCase().includes(searchTerm.toLowerCase()))
	}, [percentageShareColumns, searchTerm])

	const columnGroups = React.useMemo(() => {
		const groups = [
			{
				title: 'Custom Columns',
				columns: customColumnsForStandardView,
				show: customColumns.length > 0
			},
			{
				title: 'Percentage Share',
				columns: filteredPercentageColumns,
				show: true
			},
			{
				title: 'TVL & Market',
				columns: filteredColumns.filter(
					(col) => col.category === TABLE_CATEGORIES.TVL || ['name', 'category'].includes(col.key)
				)
			},
			{
				title: 'Fees & Revenue',
				columns: filteredColumns.filter((col) =>
					[TABLE_CATEGORIES.FEES, TABLE_CATEGORIES.REVENUE].includes(col.category)
				)
			},
			{
				title: 'Volume & Other',
				columns: filteredColumns.filter((col) => col.category === TABLE_CATEGORIES.VOLUME || !col.category)
			}
		]
		return groups.filter((group) => group.show !== false && group.columns.length > 0)
	}, [filteredColumns, customColumnsForStandardView, customColumns.length, filteredPercentageColumns])

	if (!showColumnPanel) return null

	return (
		<div className="mb-4 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
			<div className="mb-3 flex items-center justify-between">
				<div className="flex items-center gap-4">
					<h4 className="text-sm font-medium pro-text1">Customize Columns</h4>
					{/* Tab Navigation */}
					<div className="flex rounded-md border pro-divider pro-bg2">
						<button
							onClick={() => setActiveTab('columns')}
							className={`px-3 py-1 text-xs transition-colors first:rounded-l-md last:rounded-r-md ${
								activeTab === 'columns' ? 'bg-(--primary) text-white' : 'pro-hover-bg pro-text2'
							}`}
						>
							Standard Columns
						</button>
						<button
							onClick={() => setActiveTab('custom')}
							className={`px-3 py-1 text-xs transition-colors first:rounded-l-md last:rounded-r-md ${
								activeTab === 'custom' ? 'bg-(--primary) text-white' : 'pro-hover-bg pro-text2'
							}`}
						>
							Custom Columns
						</button>
						<button
							onClick={() => setActiveTab('views')}
							className={`relative px-3 py-1 text-xs transition-colors first:rounded-l-md last:rounded-r-md ${
								activeTab === 'views' ? 'bg-(--primary) text-white' : 'pro-hover-bg pro-text2'
							}`}
						>
							<span className="flex items-center gap-1">
								Saved Views
								{customViews.length > 0 && (
									<span className="ml-1 rounded-full bg-pro-blue-100 px-1.5 py-0.5 text-[10px] text-pro-blue-400 dark:bg-pro-blue-300/20 dark:text-pro-blue-200">
										{customViews.length}
									</span>
								)}
							</span>
						</button>
					</div>
				</div>
				{activeTab === 'columns' && (
					<div className="flex items-center gap-2">
						<button
							onClick={() => {
								const allKeys = protocolsByChainTableColumns.map((col) => col.key)
								addOption(allKeys, true)
							}}
							className="rounded-md border pro-divider pro-bg2 pro-hover-bg px-2 py-1 text-xs pro-text2 transition-colors"
						>
							Show All
						</button>
						<button
							onClick={() => addOption(['name', 'category'], true)}
							className="rounded-md border pro-divider pro-bg2 pro-hover-bg px-2 py-1 text-xs pro-text2 transition-colors"
						>
							Hide All
						</button>
					</div>
				)}
			</div>

			{activeTab === 'columns' && (
				<>
					{/* Search Columns */}
					<div className="relative mb-3">
						<Icon
							name="search"
							height={14}
							width={14}
							className="absolute top-1/2 left-3 -translate-y-1/2 transform pro-text3"
						/>
						<input
							type="text"
							placeholder="Search columns..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full border pro-divider pro-bg2 py-2 pr-3 pl-9 text-sm pro-text1 transition-colors placeholder:pro-text3 focus:border-(--primary) focus:outline-hidden"
						/>
					</div>

					<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
						{/* Active Columns */}
						<div>
							<h5 className="mb-2 flex items-center gap-2 text-xs font-medium tracking-wide pro-text2 uppercase">
								<Icon name="eye" height={12} width={12} />
								Active Columns ({visibleColumnCount})
							</h5>
							<p className="mb-3 text-xs pro-text3">Use arrows to reorder • Click × to hide</p>
							<div className="thin-scrollbar max-h-60 space-y-1 overflow-y-auto">
								{visibleColumnOrder.map((columnKey) => {
										const column = columnsByKey.get(columnKey)
										if (!column) return null
										const isCustom = customColumnIdSet.has(columnKey)
										return (
											<ColumnButton
												key={columnKey}
												column={column}
												isActive={true}
												isCustom={isCustom}
												currentColumns={currentColumns}
												columnOrder={columnOrder}
												moveColumnUp={moveColumnUp}
												moveColumnDown={moveColumnDown}
												toggleColumnVisibility={toggleColumnVisibility}
												customColumns={customColumns}
											/>
										)
									})}
							</div>
						</div>

						{/* Available Columns - Grouped */}
						<div>
							<h5 className="mb-2 flex items-center gap-2 text-xs font-medium tracking-wide pro-text2 uppercase">
								<Icon name="plus" height={12} width={12} />
								Available Columns
							</h5>
							<p className="mb-3 text-xs pro-text3">Click to add to table</p>
							<div className="thin-scrollbar max-h-60 space-y-3 overflow-y-auto">
								{columnGroups.map((group) => (
									<div key={group.title}>
										<h6 className="mb-1 text-xs font-medium pro-text2">{group.title}</h6>
										<div className="space-y-1">
											{group.columns
												.filter((col) => !currentColumns[col.key])
												.map((column) => {
													const isCustom = group.title === 'Custom Columns'
													return (
														<ColumnButton
															key={column.key}
															column={column}
															isActive={false}
															isCustom={isCustom}
															currentColumns={currentColumns}
															columnOrder={columnOrder}
															moveColumnUp={moveColumnUp}
															moveColumnDown={moveColumnDown}
															toggleColumnVisibility={toggleColumnVisibility}
															customColumns={customColumns}
														/>
													)
												})}
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</>
			)}

			{activeTab === 'custom' && onAddCustomColumn && onRemoveCustomColumn && onUpdateCustomColumn && (
				<CustomColumnPanel
					customColumns={customColumns}
					onAddCustomColumn={onAddCustomColumn}
					onRemoveCustomColumn={onRemoveCustomColumn}
					onUpdateCustomColumn={onUpdateCustomColumn}
				/>
			)}

			{activeTab === 'views' && (
				<div className="space-y-4">
					{customViews.length === 0 ? (
						<div className="py-8 text-center pro-text3">
							<Icon name="eye" height={32} width={32} className="mx-auto mb-2 opacity-50" />
							<p className="text-sm">No saved views yet</p>
							<p className="mt-1 text-xs">
								Save your current column configuration as a view to quickly switch between different layouts
							</p>
						</div>
					) : (
						<div className="space-y-2">
							<p className="mb-3 text-xs pro-text3">Click on a view to load it, or use the icons to manage views</p>
							{customViews.map((view) => (
								<div
									key={view.id}
									className={`flex items-center justify-between border pro-divider pro-bg2 pro-hover-bg p-3 transition-colors ${
										activeViewId === view.id ? 'border-(--primary)' : ''
									}`}
								>
									<button onClick={() => onLoadView?.(view.id)} className="flex flex-1 flex-col items-start gap-1">
										<div className="flex items-center gap-2">
											<span className="text-sm font-medium pro-text1">{view.name}</span>
											{activeViewId === view.id && (
												<span className="rounded-md bg-pro-green-100 px-1.5 py-0.5 text-xs text-pro-green-400 dark:bg-pro-green-300/20 dark:text-pro-green-200">
													Active
												</span>
											)}
										</div>
										<div className="flex items-center gap-3 text-xs pro-text3">
											<span>{view.columnOrder?.length || 0} columns</span>
											{view.customColumns && view.customColumns.length > 0 && (
												<span>{view.customColumns.length} custom columns</span>
											)}
											<span>Created {new Date(view.createdAt).toLocaleDateString()}</span>
										</div>
									</button>
									<div className="flex items-center gap-1">
										<Tooltip content="Delete view">
											<button
												onClick={() => {
													if (confirm(`Delete view "${view.name}"?`)) {
														onDeleteView?.(view.id)
													}
												}}
												className="rounded-md p-2 pro-text3 transition-colors hover:text-(--error)"
											>
												<Icon name="trash-2" height={16} width={16} />
											</button>
										</Tooltip>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			)}

			<div className="mt-4 flex items-center justify-between border-t pro-divider pt-3 text-xs">
				<span className="pro-text3">
					{activeTab === 'columns'
						? `${visibleColumnCount} of ${protocolsByChainTableColumns.length} columns visible`
						: activeTab === 'custom'
							? `${customColumns.length} custom columns`
							: `${customViews.length} saved views`}
				</span>
				<button
					onClick={() => setShowColumnPanel(false)}
					className="rounded-md border border-(--primary) bg-(--primary) px-3 py-1 text-white transition-colors hover:bg-(--primary-hover)"
				>
					Done
				</button>
			</div>
		</div>
	)
}
