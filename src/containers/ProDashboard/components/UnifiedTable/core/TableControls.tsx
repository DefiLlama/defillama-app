import { ReactNode } from 'react'

interface TableControlsProps {
	searchTerm: string
	onSearchChange: (value: string) => void
	actionSlot?: ReactNode
}

export function TableControls({ searchTerm, onSearchChange, actionSlot }: TableControlsProps) {
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
			{actionSlot && <div className="flex items-center justify-end">{actionSlot}</div>}
		</div>
	)
}
