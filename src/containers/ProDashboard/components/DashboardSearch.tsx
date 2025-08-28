import { Icon } from '~/components/Icon'

interface DashboardSearchProps {
	searchQuery: string
	onSearchChange: (query: string) => void
}

export function DashboardSearch({ searchQuery, onSearchChange }: DashboardSearchProps) {
	return (
		<div className="w-full flex-1 lg:max-w-3xl">
			<div className="relative flex-1">
				<Icon name="search" height={16} width={16} className="absolute top-1/2 left-3 -translate-y-1/2" />
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => onSearchChange(e.target.value)}
					placeholder="Search dashboards by name or description or tags..."
					className="w-full rounded-md border border-(--form-control-border) bg-(--cards-bg) px-2 py-2 pl-8 text-base text-black dark:text-white"
				/>
			</div>
		</div>
	)
}
