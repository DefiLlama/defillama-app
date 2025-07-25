import * as React from 'react'
import { Icon } from '~/components/Icon'
import { TABLE_CATEGORIES, protocolsByChainTableColumns } from '~/components/Table/Defi/Protocols'
import { Tooltip } from '~/components/Tooltip'
import { CustomColumnPanel } from './CustomColumnPanel'

const metricDescriptions: Record<string, string> = {
	name: 'Protocol name',
	category: 'Protocol category or type',
	tvl: 'Total Value Locked - The total USD value of assets deposited in the protocol',
	change_1d: '24-hour percentage change in TVL',
	change_7d: '7-day percentage change in TVL',
	change_1m: '30-day percentage change in TVL',
	mcap: 'Market capitalization of the protocol token',
	mcaptvl: 'Market Capitalization to TVL ratio',
	fees_24h: 'Total fees generated in the last 24 hours',
	fees_7d: 'Total fees generated in the last 7 days',
	fees_30d: 'Total fees generated in the last 30 days',
	fees_1y: 'Average monthly fees over the past year',
	revenue_24h: 'Total revenue generated in the last 24 hours',
	revenue_7d: 'Total revenue generated in the last 7 days',
	revenue_30d: 'Total revenue generated in the last 30 days',
	revenue_1y: 'Total revenue generated in the past year',
	average_revenue_1y: 'Average monthly revenue over the past year',
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
	volumeChange_7d: '7-day percentage change in spot trading volume',
	cumulativeVolume: 'Total cumulative trading volume since inception',
	tvl_share: 'Percentage of total TVL across all protocols',
	mcap_share: 'Percentage of total market cap across all protocols',
	fees_24h_share: 'Percentage of total 24h fees across all protocols',
	fees_7d_share: 'Percentage of total 7d fees across all protocols',
	fees_30d_share: 'Percentage of total 30d fees across all protocols',
	fees_1y_share: 'Percentage of total yearly fees across all protocols',
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
	onUpdateCustomColumn
}: ColumnManagementPanelProps) {
	const [activeTab, setActiveTab] = React.useState<'columns' | 'custom'>('columns')

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
					<div className="flex items-center justify-between p-2 border pro-divider pro-hover-bg transition-colors pro-bg2 w-full">
						<div className="flex items-center gap-2">
							<Icon name="check" height={12} width={12} className="text-green-500" />
							<span className="text-xs pro-text1">{column.name}</span>
							{isCustom && <span className="text-xs px-1 py-0.5 bg-(--primary1) text-white rounded-sm">Custom</span>}
							{column.key?.endsWith('_share') && (
								<span className="text-xs px-1 py-0.5 bg-blue-600 text-white rounded-sm">%</span>
							)}
						</div>
						<div className="flex items-center gap-1">
							{moveColumnUp && !isFirst && (
								<button
									onClick={() => moveColumnUp(column.key)}
									className="pro-text3 hover:pro-text1 transition-colors p-1"
									title="Move up"
								>
									<Icon name="chevron-up" height={10} width={10} />
								</button>
							)}
							{moveColumnDown && !isLast && (
								<button
									onClick={() => moveColumnDown(column.key)}
									className="pro-text3 hover:pro-text1 transition-colors p-1"
									title="Move down"
								>
									<Icon name="chevron-down" height={10} width={10} />
								</button>
							)}
							<button
								onClick={() => toggleColumnVisibility(column.key, false)}
								className="pro-text3 hover:pro-text1 transition-colors p-1"
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
					className="flex items-center gap-2 w-full p-2 text-left border pro-divider pro-hover-bg transition-colors pro-bg2"
				>
					<Icon name="plus" height={10} width={10} className="pro-text3" />
					<span className="text-xs pro-text1">{column.name}</span>
					{column.key?.endsWith('_share') && (
						<span className="text-xs px-1 py-0.5 bg-blue-600 text-white rounded-sm ml-auto">%</span>
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
		<div className="mb-4 p-4 border pro-divider pro-bg3">
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-4">
					<h4 className="text-sm font-medium pro-text1">Customize Columns</h4>
					{/* Tab Navigation */}
					<div className="flex border pro-divider pro-bg2">
						<button
							onClick={() => setActiveTab('columns')}
							className={`px-3 py-1 text-xs transition-colors ${
								activeTab === 'columns' ? 'bg-(--primary1) text-white' : 'pro-text2 pro-hover-bg'
							}`}
						>
							Standard Columns
						</button>
						<button
							onClick={() => setActiveTab('custom')}
							className={`px-3 py-1 text-xs transition-colors ${
								activeTab === 'custom' ? 'bg-(--primary1) text-white' : 'pro-text2 pro-hover-bg'
							}`}
						>
							Custom Columns
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
							className="px-2 py-1 text-xs border pro-divider pro-hover-bg pro-text2 transition-colors pro-bg2"
						>
							Show All
						</button>
						<button
							onClick={() => addOption(['name', 'category'], true)}
							className="px-2 py-1 text-xs border pro-divider pro-hover-bg pro-text2 transition-colors pro-bg2"
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
							className="absolute left-3 top-1/2 transform -translate-y-1/2 pro-text3"
						/>
						<input
							type="text"
							placeholder="Search columns..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-9 pr-3 py-2 text-sm border pro-divider pro-text1 placeholder:pro-text3 focus:outline-hidden focus:border-(--primary1) transition-colors pro-bg2"
						/>
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{/* Active Columns */}
						<div>
							<h5 className="text-xs font-medium pro-text2 mb-2 uppercase tracking-wide flex items-center gap-2">
								<Icon name="eye" height={12} width={12} />
								Active Columns ({Object.values(currentColumns).filter(Boolean).length})
							</h5>
							<p className="text-xs pro-text3 mb-3">Use arrows to reorder • Click × to hide</p>
							<div className="space-y-1 max-h-60 overflow-y-auto thin-scrollbar">
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
							<h5 className="text-xs font-medium pro-text2 mb-2 uppercase tracking-wide flex items-center gap-2">
								<Icon name="plus" height={12} width={12} />
								Available Columns
							</h5>
							<p className="text-xs pro-text3 mb-3">Click to add to table</p>
							<div className="space-y-3 max-h-60 overflow-y-auto thin-scrollbar">
								{columnGroups.map((group) => (
									<div key={group.title}>
										<h6 className="text-xs font-medium pro-text2 mb-1">{group.title}</h6>
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

			{/* Summary */}
			<div className="mt-4 pt-3 border-t pro-divider flex items-center justify-between text-xs">
				<span className="pro-text3">
					{activeTab === 'columns'
						? `${Object.values(currentColumns).filter(Boolean).length} of ${
								protocolsByChainTableColumns.length
						  } columns visible`
						: `${customColumns.length} custom columns`}
				</span>
				<button
					onClick={() => setShowColumnPanel(false)}
					className="px-3 py-1 bg-(--primary1) text-white hover:bg-(--primary1-hover) transition-colors border border-(--primary1)"
				>
					Done
				</button>
			</div>
		</div>
	)
}
