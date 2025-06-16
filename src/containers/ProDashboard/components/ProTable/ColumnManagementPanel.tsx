import * as React from 'react'
import { Icon } from '~/components/Icon'
import { TABLE_CATEGORIES, protocolsByChainTableColumns } from '~/components/Table/Defi/Protocols'
import { CustomColumnPanel } from './CustomColumnPanel'
import { Tooltip } from '~/components/Tooltip'

const metricDescriptions: Record<string, string> = {
	name: 'Protocol name',
	category: 'Protocol category or type',
	tvl: 'Total Value Locked - The total USD value of assets deposited in the protocol',
	change_1d: '24-hour percentage change in TVL',
	change_7d: '7-day percentage change in TVL',
	change_1m: '30-day percentage change in TVL',
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
	cumulativeVolume: 'Total cumulative trading volume since inception'
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
		return [...protocolsByChainTableColumns, ...customColumnsForStandardView]
	}, [customColumnsForStandardView])

	// Helper component for column buttons
	const ColumnButton = ({ column, isActive, isCustom }: { column: any; isActive: boolean; isCustom?: boolean }) => {
		const description = isCustom
			? customColumns.find((c) => c.id === column.key)?.expression || 'Custom column'
			: metricDescriptions[column.key] || ''

		if (isActive) {
			return (
				<Tooltip key={column.key} content={description} className="w-full">
					<div className="flex items-center justify-between p-2 border pro-divider pro-hover-bg transition-colors pro-bg2 w-full">
						<div className="flex items-center gap-2">
							<Icon name="check" height={12} width={12} className="text-green-500" />
							<span className="text-xs pro-text1">{column.name}</span>
							{isCustom && <span className="text-xs px-1 py-0.5 bg-[var(--primary1)] text-white rounded">Custom</span>}
						</div>
						<button
							onClick={() => toggleColumnVisibility(column.key, false)}
							className="pro-text3 hover:pro-text1 transition-colors"
						>
							<Icon name="x" height={12} width={12} />
						</button>
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
				</button>
			</Tooltip>
		)
	}

	const columnGroups = React.useMemo(() => {
		const groups = [
			{
				title: 'Custom Columns',
				columns: customColumnsForStandardView,
				show: customColumns.length > 0
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
	}, [filteredColumns, customColumnsForStandardView, customColumns.length])

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
								activeTab === 'columns' ? 'bg-[var(--primary1)] text-white' : 'pro-text2 pro-hover-bg'
							}`}
						>
							Standard Columns
						</button>
						<button
							onClick={() => setActiveTab('custom')}
							className={`px-3 py-1 text-xs transition-colors ${
								activeTab === 'custom' ? 'bg-[var(--primary1)] text-white' : 'pro-text2 pro-hover-bg'
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
							className="w-full pl-9 pr-3 py-2 text-sm border pro-divider pro-text1 placeholder:pro-text3 focus:outline-none focus:border-[var(--primary1)] transition-colors pro-bg2"
						/>
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{/* Active Columns */}
						<div>
							<h5 className="text-xs font-medium pro-text2 mb-2 uppercase tracking-wide flex items-center gap-2">
								<Icon name="eye" height={12} width={12} />
								Active Columns ({Object.values(currentColumns).filter(Boolean).length})
							</h5>
							<p className="text-xs pro-text3 mb-3">Click × to hide</p>
							<div className="space-y-1 max-h-60 overflow-y-auto thin-scrollbar">
								{columnOrder
									.filter((key) => currentColumns[key])
									.map((columnKey) => {
										const column = allColumnsForDisplay.find((col) => col.key === columnKey)
										if (!column) return null
										const isCustom = customColumns.some((customCol) => customCol.id === columnKey)
										return <ColumnButton key={columnKey} column={column} isActive={true} isCustom={isCustom} />
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
					className="px-3 py-1 bg-[var(--primary1)] text-white hover:bg-[var(--primary1-hover)] transition-colors border border-[var(--primary1)]"
				>
					Done
				</button>
			</div>
		</div>
	)
}
