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
		return columns.filter((column) => column.name && column.name.toLowerCase().includes(searchTerm.toLowerCase()))
	}, [columns, searchTerm])

	const percentageShareColumns = React.useMemo(() => {
		return filteredColumns.filter((col) => col.id.endsWith('_share'))
	}, [filteredColumns])

	const standardColumns = React.useMemo(() => {
		return filteredColumns.filter((col) => !col.id.endsWith('_share'))
	}, [filteredColumns])

	const columnGroups = React.useMemo(() => {
		const groups = [
			{
				title: 'Percentage Share',
				columns: percentageShareColumns,
				show: percentageShareColumns.length > 0
			},
			{
				title: 'Standard Metrics',
				columns: standardColumns,
				show: standardColumns.length > 0
			}
		]
		return groups.filter((group) => group.show)
	}, [percentageShareColumns, standardColumns])

	const activeColumns = React.useMemo(() => {
		const orderedVisibleColumns = columnOrder.filter((id) => columnVisibility[id] !== false)
		const unorderedVisibleColumns = columns
			.filter((col) => columnVisibility[col.id] !== false && !columnOrder.includes(col.id))
			.map((col) => col.id)
		return [...orderedVisibleColumns, ...unorderedVisibleColumns]
	}, [columnOrder, columnVisibility, columns])

	if (!showColumnPanel) return null

	return (
		<div className="mb-4 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
			<div className="mb-3 flex items-center justify-between">
				<h4 className="text-sm font-medium pro-text1">Customize Columns</h4>
				<div className="flex items-center gap-2">
					<button
						onClick={() => {
							for (const col of columns) {
								if (columnVisibility[col.id] === false) {
									toggleColumnVisibility(col.id)
								}
							}
						}}
						className="rounded-md border pro-divider pro-bg2 pro-hover-bg px-2 py-1 text-xs pro-text2 transition-colors"
					>
						Show All
					</button>
					<button
						onClick={() => {
							for (const col of columns) {
								if (col.id !== 'name' && columnVisibility[col.id] !== false) {
									toggleColumnVisibility(col.id)
								}
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
						Active Columns ({activeColumns.length})
					</h5>
					<p className="mb-3 text-xs pro-text3">Use arrows to reorder • Click × to hide</p>
					<div className="thin-scrollbar max-h-60 space-y-1 overflow-y-auto">
						{activeColumns.map((columnId, index) => {
							const column = columns.find((col) => col.id === columnId)
							if (!column) return null

							const isFirst = index === 0
							const isLast = index === activeColumns.length - 1

							return (
								<div
									key={columnId}
									className="flex items-center justify-between rounded-md border pro-divider pro-bg2 pro-hover-bg p-2 transition-colors"
								>
									<div className="flex items-center gap-2">
										<Icon name="check" height={12} width={12} className="text-(--success)" />
										<span className="text-xs pro-text1">{column.name}</span>
										{columnId.endsWith('_share') && (
											<span className="rounded-md bg-pro-blue-100 px-1 py-0.5 text-xs text-pro-blue-400 dark:bg-pro-blue-300/20 dark:text-pro-blue-200">
												%
											</span>
										)}
									</div>
									<div className="flex items-center gap-1">
										{moveColumnUp && !isFirst && (
											<button
												onClick={() => moveColumnUp(columnId)}
												className="rounded-md p-1 pro-text3 transition-colors hover:pro-text1"
												title="Move up"
											>
												<Icon name="chevron-up" height={10} width={10} />
											</button>
										)}
										{moveColumnDown && !isLast && (
											<button
												onClick={() => moveColumnDown(columnId)}
												className="rounded-md p-1 pro-text3 transition-colors hover:pro-text1"
												title="Move down"
											>
												<Icon name="chevron-down" height={10} width={10} />
											</button>
										)}
										<button
											onClick={() => toggleColumnVisibility(columnId)}
											className="rounded-md p-1 pro-text3 transition-colors hover:pro-text1"
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
										.filter((col) => columnVisibility[col.id] === false)
										.map((column) => (
											<button
												key={column.id}
												onClick={() => toggleColumnVisibility(column.id)}
												className="flex w-full items-center gap-2 rounded-md border pro-divider pro-bg2 pro-hover-bg p-2 text-left transition-colors"
											>
												<Icon name="plus" height={10} width={10} className="pro-text3" />
												<span className="text-xs pro-text1">{column.name}</span>
												{column.id.endsWith('_share') && (
													<span className="ml-auto rounded-md bg-pro-blue-100 px-1 py-0.5 text-xs text-pro-blue-400 dark:bg-pro-blue-300/20 dark:text-pro-blue-200">
														%
													</span>
												)}
											</button>
										))}
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			<div className="mt-4 flex items-center justify-between border-t pro-divider pt-3 text-xs">
				<span className="pro-text3">
					{activeColumns.length} of {columns.length} columns visible
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
