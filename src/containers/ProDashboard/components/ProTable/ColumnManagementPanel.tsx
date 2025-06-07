import * as React from 'react'
import { Icon } from '~/components/Icon'
import { TABLE_CATEGORIES, protocolsByChainTableColumns } from '~/components/Table/Defi/Protocols'

interface ColumnManagementPanelProps {
	showColumnPanel: boolean
	setShowColumnPanel: (show: boolean) => void
	searchTerm: string
	setSearchTerm: (term: string) => void
	currentColumns: Record<string, boolean>
	columnOrder: string[]
	addOption: (options: string[], setLocalStorage?: boolean) => void
	toggleColumnVisibility: (columnKey: string, isVisible: boolean) => void
}

export function ColumnManagementPanel({
	showColumnPanel,
	setShowColumnPanel,
	searchTerm,
	setSearchTerm,
	currentColumns,
	columnOrder,
	addOption,
	toggleColumnVisibility
}: ColumnManagementPanelProps) {
	// Filter columns by search term
	const filteredColumns = React.useMemo(() => {
		return protocolsByChainTableColumns.filter((column) => column.name.toLowerCase().includes(searchTerm.toLowerCase()))
	}, [searchTerm])

	if (!showColumnPanel) return null

	return (
		<div className="mb-4 p-4 border border-[var(--divider)] bg-[var(--bg6)] dark:bg-[#070e0f]">
			<div className="flex items-center justify-between mb-3">
				<h4 className="text-sm font-medium text-[var(--text1)]">Customize Columns</h4>
				<div className="flex items-center gap-2">
					<button
						onClick={() => {
							const allKeys = protocolsByChainTableColumns.map((col) => col.key)
							addOption(allKeys, true)
						}}
						className="px-2 py-1 text-xs border border-[var(--divider)] hover:bg-[var(--bg3)] text-[var(--text2)] transition-colors bg-[var(--bg1)] dark:bg-[#070e0f]"
					>
						Show All
					</button>
					<button
						onClick={() => addOption(['name', 'category'], true)}
						className="px-2 py-1 text-xs border border-[var(--divider)] hover:bg-[var(--bg3)] text-[var(--text2)] transition-colors bg-[var(--bg1)] dark:bg-[#070e0f]"
					>
						Hide All
					</button>
				</div>
			</div>

			{/* Search Columns */}
			<div className="relative mb-3">
				<Icon
					name="search"
					height={14}
					width={14}
					className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text3)]"
				/>
				<input
					type="text"
					placeholder="Search columns..."
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--divider)] text-[var(--text1)] placeholder-[var(--text3)] focus:outline-none focus:border-[var(--primary1)] transition-colors bg-[var(--bg1)] dark:bg-[#070e0f]"
				/>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Active Columns */}
				<div>
					<h5 className="text-xs font-medium text-[var(--text2)] mb-2 uppercase tracking-wide flex items-center gap-2">
						<Icon name="eye" height={12} width={12} />
						Active Columns ({Object.values(currentColumns).filter(Boolean).length})
					</h5>
					<p className="text-xs text-[var(--text3)] mb-3">Click × to hide</p>
					<div className="space-y-1 max-h-60 overflow-y-auto">
						{columnOrder
							.filter((key) => currentColumns[key])
							.map((columnKey) => {
								const column = protocolsByChainTableColumns.find((col) => col.key === columnKey)
								if (!column) return null
								return (
									<div
										key={columnKey}
										className="flex items-center justify-between p-2 border border-[var(--divider)] hover:bg-[var(--bg3)] transition-colors bg-[var(--bg1)] dark:bg-[#070e0f]"
									>
										<div className="flex items-center gap-2">
											<Icon name="check" height={12} width={12} className="text-green-500" />
											<span className="text-xs text-[var(--text1)]">{column.name}</span>
										</div>
										<button
											onClick={() => toggleColumnVisibility(columnKey, false)}
											className="text-[var(--text3)] hover:text-[var(--text1)] transition-colors"
										>
											<Icon name="x" height={12} width={12} />
										</button>
									</div>
								)
							})}
					</div>
				</div>

				{/* Available Columns - Grouped */}
				<div>
					<h5 className="text-xs font-medium text-[var(--text2)] mb-2 uppercase tracking-wide flex items-center gap-2">
						<Icon name="plus" height={12} width={12} />
						Available Columns
					</h5>
					<p className="text-xs text-[var(--text3)] mb-3">Click to add to table</p>
					<div className="space-y-3 max-h-60 overflow-y-auto">
						{/* TVL Group */}
						<div>
							<h6 className="text-xs font-medium text-[var(--text2)] mb-1">TVL & Market</h6>
							<div className="space-y-1">
								{filteredColumns
									.filter(
										(col) =>
											(col.category === TABLE_CATEGORIES.TVL || ['name', 'category'].includes(col.key)) &&
											!currentColumns[col.key]
									)
									.map((column) => (
										<button
											key={column.key}
											onClick={() => toggleColumnVisibility(column.key, true)}
											className="flex items-center gap-2 w-full p-2 text-left border border-[var(--divider)] hover:bg-[var(--bg3)] transition-colors bg-[var(--bg1)] dark:bg-[#070e0f]"
										>
											<Icon name="plus" height={10} width={10} className="text-[var(--text3)]" />
											<span className="text-xs text-[var(--text1)]">{column.name}</span>
										</button>
									))}
							</div>
						</div>

						{/* Fees & Revenue Group */}
						<div>
							<h6 className="text-xs font-medium text-[var(--text2)] mb-1">Fees & Revenue</h6>
							<div className="space-y-1">
								{filteredColumns
									.filter(
										(col) =>
											[TABLE_CATEGORIES.FEES, TABLE_CATEGORIES.REVENUE].includes(col.category) &&
											!currentColumns[col.key]
									)
									.map((column) => (
										<button
											key={column.key}
											onClick={() => toggleColumnVisibility(column.key, true)}
											className="flex items-center gap-2 w-full p-2 text-left border border-[var(--divider)] hover:bg-[var(--bg3)] transition-colors bg-[var(--bg1)] dark:bg-[#070e0f]"
										>
											<Icon name="plus" height={10} width={10} className="text-[var(--text3)]" />
											<span className="text-xs text-[var(--text1)]">{column.name}</span>
										</button>
									))}
							</div>
						</div>

						{/* Volume Group */}
						<div>
							<h6 className="text-xs font-medium text-[var(--text2)] mb-1">Volume & Other</h6>
							<div className="space-y-1">
								{filteredColumns
									.filter(
										(col) => (col.category === TABLE_CATEGORIES.VOLUME || !col.category) && !currentColumns[col.key]
									)
									.map((column) => (
										<button
											key={column.key}
											onClick={() => toggleColumnVisibility(column.key, true)}
											className="flex items-center gap-2 w-full p-2 text-left border border-[var(--divider)] hover:bg-[var(--bg3)] transition-colors bg-[var(--bg1)] dark:bg-[#070e0f]"
										>
											<Icon name="plus" height={10} width={10} className="text-[var(--text3)]" />
											<span className="text-xs text-[var(--text1)]">{column.name}</span>
										</button>
									))}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Summary */}
			<div className="mt-4 pt-3 border-t border-[var(--divider)] flex items-center justify-between text-xs">
				<span className="text-[var(--text3)]">
					{Object.values(currentColumns).filter(Boolean).length} of {protocolsByChainTableColumns.length} columns
					visible
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