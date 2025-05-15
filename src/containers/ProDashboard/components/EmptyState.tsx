import { Icon } from '~/components/Icon'

interface EmptyStateProps {
	onAddChart: () => void
}

export function EmptyState({ onAddChart }: EmptyStateProps) {
	return (
		<div className="text-center py-10">
			<div className="bg-[var(--bg2)] rounded-lg p-8 max-w-md mx-auto">
				<div className="mb-4">
					<Icon name="bar-chart-2" height={48} width={48} className="mx-auto text-[var(--text3)]" />
				</div>
				<h2 className="text-xl font-semibold mb-2">No charts added yet</h2>
				<p className="text-[var(--text2)] mb-4">Click the "Add Chart" button to start building your dashboard</p>
				<button
					className="px-4 py-2 rounded-md bg-[var(--primary1)] text-white flex items-center gap-2 mx-auto hover:bg-[var(--primary1-hover)]"
					onClick={onAddChart}
				>
					<Icon name="plus" height={16} width={16} />
					Add Your First Chart
				</button>
			</div>
		</div>
	)
}
