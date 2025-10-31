interface TableControlsProps {
	searchTerm: string
	onSearchChange: (value: string) => void
	onExportClick: () => void
	isExportDisabled?: boolean
}

export function TableControls({
	searchTerm,
	onSearchChange,
	onExportClick,
	isExportDisabled = false
}: TableControlsProps) {
	return (
		<div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<div className="flex w-full items-center gap-2 sm:max-w-sm">
				<input
					type="search"
					value={searchTerm}
					onChange={(event) => onSearchChange(event.target.value)}
					placeholder="Search protocols, chains, categories..."
					className="w-full rounded-md border border-(--divider) bg-(--cards-bg) px-3 py-2 text-sm text-(--text-primary) focus:border-(--primary) focus:outline-none focus:ring-2 focus:ring-(--primary)/30"
				/>
			</div>
			<button
				type="button"
				onClick={onExportClick}
				disabled={isExportDisabled}
				className={`inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
					isExportDisabled
						? 'cursor-not-allowed border border-(--divider) text-(--text-tertiary) opacity-60'
						: 'bg-(--primary) text-white hover:bg-(--primary-dark)'
				}`}
			>
				Export CSV
			</button>
		</div>
	)
}

