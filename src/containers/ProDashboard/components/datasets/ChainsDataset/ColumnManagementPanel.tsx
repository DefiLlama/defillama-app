import * as React from 'react'
import { Icon } from '~/components/Icon'

interface Column {
	id: string
	name: string
	category?: string
}

interface ColumnManagementPanelProps {
	showColumnPanel: boolean
	setShowColumnPanel: (show: boolean) => void
	columns: Column[]
	columnVisibility: Record<string, boolean>
	columnOrder: string[]
	toggleColumnVisibility: (columnId: string) => void
	moveColumnUp?: (columnId: string) => void
	moveColumnDown?: (columnId: string) => void
}

export function ColumnManagementPanel({
	showColumnPanel,
	setShowColumnPanel,
	columns,
	columnVisibility,
	columnOrder,
	toggleColumnVisibility,
	moveColumnUp,
	moveColumnDown
}: ColumnManagementPanelProps) {
	const [searchTerm, setSearchTerm] = React.useState('')

	const filteredColumns = React.useMemo(() => {
		return columns.filter((column) => column.name.toLowerCase().includes(searchTerm.toLowerCase()))
	}, [columns, searchTerm])

	const activeColumns = React.useMemo(() => {
		const orderedVisibleColumns = columnOrder.filter((id) => columnVisibility[id] !== false)
		const unorderedVisibleColumns = columns
			.filter((col) => columnVisibility[col.id] !== false && !columnOrder.includes(col.id))
			.map((col) => col.id)
		return [...orderedVisibleColumns, ...unorderedVisibleColumns]
	}, [columnOrder, columnVisibility, columns])

	if (!showColumnPanel) return null

	return (
		<div className="mb-4 p-4 border pro-divider pro-bg3">
			<div className="flex items-center justify-between mb-3">
				<h4 className="text-sm font-medium pro-text1">Customize Columns</h4>
				<div className="flex items-center gap-2">
					<button
						onClick={() => {
							columns.forEach((col) => {
								if (columnVisibility[col.id] === false) {
									toggleColumnVisibility(col.id)
								}
							})
						}}
						className="px-2 py-1 text-xs border pro-divider pro-hover-bg pro-text2 transition-colors pro-bg2"
					>
						Show All
					</button>
					<button
						onClick={() => {
							columns.forEach((col) => {
								if (col.id !== 'name' && columnVisibility[col.id] !== false) {
									toggleColumnVisibility(col.id)
								}
							})
						}}
						className="px-2 py-1 text-xs border pro-divider pro-hover-bg pro-text2 transition-colors pro-bg2"
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
				<div>
					<h5 className="text-xs font-medium pro-text2 mb-2 uppercase tracking-wide flex items-center gap-2">
						<Icon name="eye" height={12} width={12} />
						Active Columns ({activeColumns.length})
					</h5>
					<p className="text-xs pro-text3 mb-3">Use arrows to reorder • Click × to hide</p>
					<div className="space-y-1 max-h-60 overflow-y-auto thin-scrollbar">
						{activeColumns.map((columnId, index) => {
							const column = columns.find((col) => col.id === columnId)
							if (!column) return null

							const isFirst = index === 0
							const isLast = index === activeColumns.length - 1

							return (
								<div
									key={columnId}
									className="flex items-center justify-between p-2 border pro-divider pro-hover-bg transition-colors pro-bg2"
								>
									<div className="flex items-center gap-2">
										<Icon name="check" height={12} width={12} className="text-green-500" />
										<span className="text-xs pro-text1">{column.name}</span>
									</div>
									<div className="flex items-center gap-1">
										{moveColumnUp && !isFirst && (
											<button
												onClick={() => moveColumnUp(columnId)}
												className="pro-text3 hover:pro-text1 transition-colors p-1"
												title="Move up"
											>
												<Icon name="chevron-up" height={10} width={10} />
											</button>
										)}
										{moveColumnDown && !isLast && (
											<button
												onClick={() => moveColumnDown(columnId)}
												className="pro-text3 hover:pro-text1 transition-colors p-1"
												title="Move down"
											>
												<Icon name="chevron-down" height={10} width={10} />
											</button>
										)}
										<button
											onClick={() => toggleColumnVisibility(columnId)}
											className="pro-text3 hover:pro-text1 transition-colors p-1"
											disabled={columnId === 'name'}
										>
											<Icon name="x" height={12} width={12} />
										</button>
									</div>
								</div>
							)
						})}
					</div>
				</div>

				<div>
					<h5 className="text-xs font-medium pro-text2 mb-2 uppercase tracking-wide flex items-center gap-2">
						<Icon name="plus" height={12} width={12} />
						Available Columns
					</h5>
					<p className="text-xs pro-text3 mb-3">Click to add to table</p>
					<div className="space-y-1 max-h-60 overflow-y-auto thin-scrollbar">
						{filteredColumns
							.filter((col) => columnVisibility[col.id] === false)
							.map((column) => (
								<button
									key={column.id}
									onClick={() => toggleColumnVisibility(column.id)}
									className="flex items-center gap-2 w-full p-2 text-left border pro-divider pro-hover-bg transition-colors pro-bg2"
								>
									<Icon name="plus" height={10} width={10} className="pro-text3" />
									<span className="text-xs pro-text1">{column.name}</span>
								</button>
							))}
					</div>
				</div>
			</div>

			<div className="mt-4 pt-3 border-t pro-divider flex items-center justify-between text-xs">
				<span className="pro-text3">
					{activeColumns.length} of {columns.length} columns visible
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
