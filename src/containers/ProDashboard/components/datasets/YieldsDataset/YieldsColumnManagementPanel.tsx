import * as React from 'react'
import { Icon } from '~/components/Icon'

const yieldsColumnMetadata = {
	pool: { name: 'Pool', description: 'The name of the yield pool or strategy' },
	project: { name: 'Project', description: 'The protocol offering this yield opportunity' },
	chains: { name: 'Chain', description: 'The blockchain network where the pool operates' },
	tvl: { name: 'TVL', description: 'Total Value Locked - The total USD value of assets in the pool' },
	apy: { name: 'APY', description: 'Annual Percentage Yield - Total expected yearly return' },
	apyBase: { name: 'Base APY', description: 'Base yield from the protocol (e.g., trading fees, lending interest)' },
	apyReward: { name: 'Reward APY', description: 'Additional yield from reward token incentives' },
	change1d: { name: '24h Change', description: '24-hour percentage change in APY' },
	change7d: { name: '7d Change', description: '7-day percentage change in APY' },
	il7d: { name: '7d IL', description: '7-day Impermanent Loss for liquidity pools' },
	apyBase7d: { name: 'Base APY (7d)', description: 'Average base APY over the last 7 days' },
	apyNet7d: { name: 'Net APY (7d)', description: 'Net APY after accounting for impermanent loss (7d)' },
	apyMean30d: { name: 'Mean APY (30d)', description: 'Average APY over the last 30 days' },
	volumeUsd1d: { name: 'Volume (24h)', description: '24-hour trading volume in USD' },
	volumeUsd7d: { name: 'Volume (7d)', description: '7-day trading volume in USD' },
	apyBorrow: { name: 'Borrow APY', description: 'Interest rate for borrowing assets' },
	totalSupplyUsd: { name: 'Total Supplied', description: 'Total USD value of supplied assets' },
	totalBorrowUsd: { name: 'Total Borrowed', description: 'Total USD value of borrowed assets' },
	totalAvailableUsd: { name: 'Available', description: 'Available liquidity for borrowing' },
	ltv: { name: 'LTV', description: 'Loan-to-Value ratio - Maximum borrowing capacity' }
}

const yieldsColumnKeys: string[] = []
for (const columnKey in yieldsColumnMetadata) {
	yieldsColumnKeys.push(columnKey)
}

const columnGroups = [
	{
		title: 'Core Metrics',
		columns: ['pool', 'project', 'chains', 'tvl']
	},
	{
		title: 'Yield Metrics',
		columns: ['apy', 'apyBase', 'apyReward', 'change1d', 'change7d']
	},
	{
		title: 'Historical Metrics',
		columns: ['il7d', 'apyBase7d', 'apyNet7d', 'apyMean30d']
	},
	{
		title: 'Volume Metrics',
		columns: ['volumeUsd1d', 'volumeUsd7d']
	},
	{
		title: 'Lending Metrics',
		columns: ['apyBorrow', 'totalSupplyUsd', 'totalBorrowUsd', 'totalAvailableUsd', 'ltv']
	}
]

interface YieldsColumnManagementPanelProps {
	showColumnPanel: boolean
	setShowColumnPanel: (show: boolean) => void
	searchTerm: string
	setSearchTerm: (term: string) => void
	currentColumns: Record<string, boolean>
	columnOrder: string[]
	toggleColumnVisibility: (columnKey: string, isVisible: boolean) => void
	moveColumnUp?: (columnKey: string) => void
	moveColumnDown?: (columnKey: string) => void
}

const ColumnButton = ({
	columnKey,
	currentColumns,
	columnOrder,
	moveColumnUp,
	moveColumnDown,
	toggleColumnVisibility
}: {
	columnKey: string
	currentColumns: Record<string, boolean>
	columnOrder: string[]
	moveColumnUp: (columnKey: string) => void
	moveColumnDown: (columnKey: string) => void
	toggleColumnVisibility: (columnKey: string, isVisible: boolean) => void
}) => {
	const metadata = yieldsColumnMetadata[columnKey]
	const isActive = currentColumns[columnKey]

	if (isActive) {
		const visibleColumnsInOrder = columnOrder.filter((key) => currentColumns[key])
		const actualIndex = visibleColumnsInOrder.indexOf(columnKey)
		const isFirst = actualIndex === 0
		const isLast = actualIndex === visibleColumnsInOrder.length - 1

		return (
			<div
				className="flex w-full items-center justify-between rounded-md border pro-divider pro-bg2 pro-hover-bg p-2 transition-colors"
				title={metadata.description}
			>
				<div className="flex items-center gap-2">
					<Icon name="check" height={12} width={12} className="text-(--success)" />
					<span className="text-xs pro-text1">{metadata.name}</span>
				</div>
				<div className="flex items-center gap-1">
					{moveColumnUp && !isFirst && (
						<button
							onClick={(e) => {
								e.stopPropagation()
								moveColumnUp(columnKey)
							}}
							className="rounded-md p-1 pro-text3 transition-colors hover:pro-text1"
							title="Move up"
						>
							<Icon name="chevron-up" height={10} width={10} />
						</button>
					)}
					{moveColumnDown && !isLast && (
						<button
							onClick={(e) => {
								e.stopPropagation()
								moveColumnDown(columnKey)
							}}
							className="rounded-md p-1 pro-text3 transition-colors hover:pro-text1"
							title="Move down"
						>
							<Icon name="chevron-down" height={10} width={10} />
						</button>
					)}
					<button
						onClick={(e) => {
							e.stopPropagation()
							toggleColumnVisibility(columnKey, false)
						}}
						className="p-1 pro-text3 transition-colors hover:pro-text1"
						title="Remove column"
					>
						<Icon name="x" height={12} width={12} />
					</button>
				</div>
			</div>
		)
	}

	return (
		<button
			onClick={() => toggleColumnVisibility(columnKey, true)}
			className="flex w-full items-center gap-2 rounded-md border pro-divider pro-bg2 pro-hover-bg p-2 text-left transition-colors"
			title={metadata.description}
		>
			<Icon name="plus" height={10} width={10} className="pro-text3" />
			<span className="text-xs pro-text1">{metadata.name}</span>
		</button>
	)
}

export function YieldsColumnManagementPanel({
	showColumnPanel,
	setShowColumnPanel,
	searchTerm,
	setSearchTerm,
	currentColumns,
	columnOrder,
	toggleColumnVisibility,
	moveColumnUp,
	moveColumnDown
}: YieldsColumnManagementPanelProps) {
	const filteredColumns = React.useMemo(() => {
		if (!searchTerm) return yieldsColumnKeys

		const lowerSearch = searchTerm.toLowerCase()
		const result: string[] = []
		for (const key of yieldsColumnKeys) {
			const metadata = yieldsColumnMetadata[key]
			if (
				metadata.name.toLowerCase().includes(lowerSearch) ||
				metadata.description.toLowerCase().includes(lowerSearch)
			) {
				result.push(key)
			}
		}
		return result
	}, [searchTerm])

	const visibleColumnCount = React.useMemo(() => {
		let count = 0
		for (const k in currentColumns) {
			if (currentColumns[k]) count++
		}
		return count
	}, [currentColumns])

	if (!showColumnPanel) return null

	return (
		<div
			className="relative mb-4 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4"
			style={{ zIndex: 50, pointerEvents: 'auto' }}
		>
			<div className="mb-3 flex items-center justify-between">
				<h4 className="text-sm font-medium pro-text1">Customize Columns</h4>
				<div className="flex items-center gap-2">
					<button
						onClick={() => {
							for (const key in yieldsColumnMetadata) {
								toggleColumnVisibility(key, true)
							}
						}}
						className="rounded-md border pro-divider pro-bg2 pro-hover-bg px-2 py-1 text-xs pro-text2 transition-colors"
					>
						Show All
					</button>
					<button
						onClick={() => {
							for (const key in yieldsColumnMetadata) {
								toggleColumnVisibility(key, ['pool', 'project', 'chains', 'tvl'].includes(key))
							}
						}}
						className="rounded-md border pro-divider pro-bg2 pro-hover-bg px-2 py-1 text-xs pro-text2 transition-colors"
					>
						Hide All
					</button>
				</div>
			</div>

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
					className="w-full rounded-md border pro-border bg-(--bg-glass) py-2 pr-3 pl-9 text-sm pro-text1 transition-colors placeholder:pro-text3 focus:border-(--primary) focus:outline-hidden"
				/>
			</div>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<div>
					<h5 className="mb-2 flex items-center gap-2 text-xs font-medium tracking-wide pro-text2 uppercase">
						<Icon name="eye" height={12} width={12} />
						Active Columns ({visibleColumnCount})
					</h5>
					<p className="mb-3 text-xs pro-text3">Use arrows to reorder • Click × to hide</p>
					<div className="thin-scrollbar max-h-60 space-y-1 overflow-y-auto">
						{columnOrder
							.filter((key) => currentColumns[key] && yieldsColumnMetadata[key])
							.map((columnKey) => (
								<ColumnButton
									key={columnKey}
									columnKey={columnKey}
									currentColumns={currentColumns}
									columnOrder={columnOrder}
									moveColumnUp={moveColumnUp}
									moveColumnDown={moveColumnDown}
									toggleColumnVisibility={toggleColumnVisibility}
								/>
							))}
					</div>
				</div>

				<div>
					<h5 className="mb-2 flex items-center gap-2 text-xs font-medium tracking-wide pro-text2 uppercase">
						<Icon name="plus" height={12} width={12} />
						Available Columns
					</h5>
					<p className="mb-3 text-xs pro-text3">Click to add to table</p>
					<div className="thin-scrollbar max-h-60 space-y-3 overflow-y-auto">
						{columnGroups.map((group) => {
							const availableColumns = group.columns.filter(
								(col) => !currentColumns[col] && filteredColumns.includes(col)
							)

							if (availableColumns.length === 0) return null

							return (
								<div key={group.title}>
									<h6 className="mb-1 text-xs font-medium pro-text2">{group.title}</h6>
									<div className="space-y-1">
										{availableColumns.map((columnKey) => (
											<ColumnButton
												key={columnKey}
												columnKey={columnKey}
												currentColumns={currentColumns}
												columnOrder={columnOrder}
												moveColumnUp={moveColumnUp}
												moveColumnDown={moveColumnDown}
												toggleColumnVisibility={toggleColumnVisibility}
											/>
										))}
									</div>
								</div>
							)
						})}
					</div>
				</div>
			</div>

			<div className="mt-4 flex items-center justify-between border-t pro-divider pt-3 text-xs">
				<span className="pro-text3">
					{visibleColumnCount} of {yieldsColumnKeys.length} columns visible
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
