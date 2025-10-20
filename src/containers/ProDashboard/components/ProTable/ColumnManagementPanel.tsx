import * as React from 'react'
import { Icon } from '~/components/Icon'
import { protocolsByChainTableColumns, TABLE_CATEGORIES } from '~/components/Table/Defi/Protocols'
import { Tooltip } from '~/components/Tooltip'
import { CustomView } from '../../types'
import { CustomColumnPanel } from './CustomColumnPanel'

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
	customColumns = [],
	onAddCustomColumn,
	onRemoveCustomColumn,
	onUpdateCustomColumn,
	customViews = [],
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
		const usdValuedMetrics = [
			{ key: 'tvl', name: 'TVL % Share', category: TABLE_CATEGORIES.TVL },
			{ key: 'mcap', name: 'Market Cap % Share', category: TABLE_CATEGORIES.TVL },
			{ key: 'fees_24h', name: 'Fees 24h % Share', category: TABLE_CATEGORIES.FEES },
			{ key: 'fees_7d', name: 'Fees 7d % Share', category: TABLE_CATEGORIES.FEES },
			{ key: 'fees_30d', name: 'Fees 30d % Share', category: TABLE_CATEGORIES.FEES },
			{ key: 'fees_1y', name: 'Fees 1y % Share', category: TABLE_CATEGORIES.FEES },
			{ key: 'average_1y', name: 'Monthly Avg 1Y Fees % Share', category: TABLE_CATEGORIES.FEES },
			{ key: 'revenue_24h', name: 'Revenue 24h % Share', category: TABLE_CATEGORIES.REVENUE },
			{ key: 'revenue_7d', name: 'Revenue 7d % Share', category: TABLE_CATEGORIES.REVENUE },
			{ key: 'revenue_30d', name: 'Revenue 30d % Share', category: TABLE_CATEGORIES.REVENUE },
			{ key: 'revenue_1y', name: 'Revenue 1y % Share', category: TABLE_CATEGORIES.REVENUE },
			{ key: 'volume_24h', name: 'Volume 24h % Share', category: TABLE_CATEGORIES.VOLUME },
			{ key: 'volume_7d', name: 'Volume 7d % Share', category: TABLE_CATEGORIES.VOLUME },
			{ key: 'cumulativeFees', name: 'Cumulative Fees % Share', category: TABLE_CATEGORIES.FEES },
			{ key: 'cumulativeVolume', name: 'Cumulative Volume % Share', category: TABLE_CATEGORIES.VOLUME }
		]

		return usdValuedMetrics.map((metric) => ({
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

	// Helper component for column buttons
	const ColumnButton = ({
		column,
		isActive,
		isCustom,
		index
	}: {
		column: any
		isActive: boolean
		isCustom?: boolean
		index?: number
	}) => {
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
					<div className="pro-divider pro-hover-bg pro-bg2 flex w-full items-center justify-between rounded-md border p-2 transition-colors">
						<div className="flex items-center gap-2">
							<Icon name="check" height={12} width={12} className="text-(--success)" />
							<span className="pro-text1 text-xs">{column.name}</span>
							{isCustom && <span className="rounded-md bg-(--primary) px-1 py-0.5 text-xs text-white">Custom</span>}
							{column.key?.endsWith('_share') && (
								<span className="bg-pro-blue-100 text-pro-blue-400 dark:bg-pro-blue-300/20 dark:text-pro-blue-200 rounded-md px-1 py-0.5 text-xs">
									%
								</span>
							)}
						</div>
						<div className="flex items-center gap-1">
							{moveColumnUp && !isFirst && (
								<button
									onClick={() => moveColumnUp(column.key)}
									className="pro-text3 hover:pro-text1 rounded-md p-1 transition-colors"
									title="Move up"
								>
									<Icon name="chevron-up" height={10} width={10} />
								</button>
							)}
							{moveColumnDown && !isLast && (
								<button
									onClick={() => moveColumnDown(column.key)}
									className="pro-text3 hover:pro-text1 rounded-md p-1 transition-colors"
									title="Move down"
								>
									<Icon name="chevron-down" height={10} width={10} />
								</button>
							)}
							<button
								onClick={() => toggleColumnVisibility(column.key, false)}
								className="pro-text3 hover:pro-text1 rounded-md p-1 transition-colors"
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
					className="pro-divider pro-hover-bg pro-bg2 flex w-full items-center gap-2 rounded-md border p-2 text-left transition-colors"
				>
					<Icon name="plus" height={10} width={10} className="pro-text3" />
					<span className="pro-text1 text-xs">{column.name}</span>
					{column.key?.endsWith('_share') && (
						<span className="bg-pro-blue-100 text-pro-blue-400 dark:bg-pro-blue-300/20 dark:text-pro-blue-200 ml-auto rounded-md px-1 py-0.5 text-xs">
							%
						</span>
					)}
				</button>
			</Tooltip>
		)
	}

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
					<h4 className="pro-text1 text-sm font-medium">Customize Columns</h4>
					{/* Tab Navigation */}
					<div className="pro-divider pro-bg2 flex rounded-md border">
						<button
							onClick={() => setActiveTab('columns')}
							className={`px-3 py-1 text-xs transition-colors first:rounded-l-md last:rounded-r-md ${
								activeTab === 'columns' ? 'bg-(--primary) text-white' : 'pro-text2 pro-hover-bg'
							}`}
						>
							Standard Columns
						</button>
						<button
							onClick={() => setActiveTab('custom')}
							className={`px-3 py-1 text-xs transition-colors first:rounded-l-md last:rounded-r-md ${
								activeTab === 'custom' ? 'bg-(--primary) text-white' : 'pro-text2 pro-hover-bg'
							}`}
						>
							Custom Columns
						</button>
						<button
							onClick={() => setActiveTab('views')}
							className={`relative px-3 py-1 text-xs transition-colors first:rounded-l-md last:rounded-r-md ${
								activeTab === 'views' ? 'bg-(--primary) text-white' : 'pro-text2 pro-hover-bg'
							}`}
						>
							<span className="flex items-center gap-1">
								Saved Views
								{customViews.length > 0 && (
									<span className="bg-pro-blue-100 text-pro-blue-400 dark:bg-pro-blue-300/20 dark:text-pro-blue-200 ml-1 rounded-full px-1.5 py-0.5 text-[10px]">
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
							className="pro-divider pro-hover-bg pro-text2 pro-bg2 rounded-md border px-2 py-1 text-xs transition-colors"
						>
							Show All
						</button>
						<button
							onClick={() => addOption(['name', 'category'], true)}
							className="pro-divider pro-hover-bg pro-text2 pro-bg2 rounded-md border px-2 py-1 text-xs transition-colors"
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
							className="pro-text3 absolute top-1/2 left-3 -translate-y-1/2 transform"
						/>
						<input
							type="text"
							placeholder="Search columns..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="pro-divider pro-text1 placeholder:pro-text3 pro-bg2 w-full border py-2 pr-3 pl-9 text-sm transition-colors focus:border-(--primary) focus:outline-hidden"
						/>
					</div>

					<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
						{/* Active Columns */}
						<div>
							<h5 className="pro-text2 mb-2 flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
								<Icon name="eye" height={12} width={12} />
								Active Columns ({Object.values(currentColumns).filter(Boolean).length})
							</h5>
							<p className="pro-text3 mb-3 text-xs">Use arrows to reorder • Click × to hide</p>
							<div className="thin-scrollbar max-h-60 space-y-1 overflow-y-auto">
								{columnOrder
									.filter((key) => currentColumns[key])
									.map((columnKey, index) => {
										const column = allColumnsForDisplay.find((col) => col.key === columnKey)
										if (!column) return null
										const isCustom = customColumns.some((customCol) => customCol.id === columnKey)
										return (
											<ColumnButton key={columnKey} column={column} isActive={true} isCustom={isCustom} index={index} />
										)
									})}
							</div>
						</div>

						{/* Available Columns - Grouped */}
						<div>
							<h5 className="pro-text2 mb-2 flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
								<Icon name="plus" height={12} width={12} />
								Available Columns
							</h5>
							<p className="pro-text3 mb-3 text-xs">Click to add to table</p>
							<div className="thin-scrollbar max-h-60 space-y-3 overflow-y-auto">
								{columnGroups.map((group) => (
									<div key={group.title}>
										<h6 className="pro-text2 mb-1 text-xs font-medium">{group.title}</h6>
										<div className="space-y-1">
											{group.columns
												.filter((col) => !currentColumns[col.key])
												.map((column) => {
													const isCustom = group.title === 'Custom Columns'
													return <ColumnButton key={column.key} column={column} isActive={false} isCustom={isCustom} />
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
						<div className="pro-text3 py-8 text-center">
							<Icon name="eye" height={32} width={32} className="mx-auto mb-2 opacity-50" />
							<p className="text-sm">No saved views yet</p>
							<p className="mt-1 text-xs">
								Save your current column configuration as a view to quickly switch between different layouts
							</p>
						</div>
					) : (
						<div className="space-y-2">
							<p className="pro-text3 mb-3 text-xs">Click on a view to load it, or use the icons to manage views</p>
							{customViews.map((view) => (
								<div
									key={view.id}
									className={`pro-divider pro-hover-bg pro-bg2 flex items-center justify-between border p-3 transition-colors ${
										activeViewId === view.id ? 'border-(--primary)' : ''
									}`}
								>
									<button onClick={() => onLoadView?.(view.id)} className="flex flex-1 flex-col items-start gap-1">
										<div className="flex items-center gap-2">
											<span className="pro-text1 text-sm font-medium">{view.name}</span>
											{activeViewId === view.id && (
												<span className="bg-pro-green-100 text-pro-green-400 dark:bg-pro-green-300/20 dark:text-pro-green-200 rounded-md px-1.5 py-0.5 text-xs">
													Active
												</span>
											)}
										</div>
										<div className="pro-text3 flex items-center gap-3 text-xs">
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
												className="pro-text3 rounded-md p-2 transition-colors hover:text-(--error)"
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

			<div className="pro-divider mt-4 flex items-center justify-between border-t pt-3 text-xs">
				<span className="pro-text3">
					{activeTab === 'columns'
						? `${Object.values(currentColumns).filter(Boolean).length} of ${
								protocolsByChainTableColumns.length
							} columns visible`
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
