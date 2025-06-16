import { Icon } from '~/components/Icon'

interface EmptyStateProps {
	onAddChart: () => void
}

export function EmptyState({ onAddChart }: EmptyStateProps) {
	return (
		<div className="text-center py-16">
			<div className="pro-glass p-12 max-w-lg mx-auto">
				<div className="mb-6">
					<Icon name="bar-chart-2" height={64} width={64} className="mx-auto pro-text3 opacity-50" />
				</div>
				<h2 className="text-2xl font-semibold pro-text1 mb-3">No charts added yet</h2>
				<p className="pro-text2 mb-6 text-lg">Click the "Add Item" button to start building your dashboard</p>
				<button
					className="px-6 py-3 bg-[var(--primary1)] text-white flex items-center gap-2 mx-auto hover:bg-[var(--primary1-hover)] text-base font-medium"
					onClick={onAddChart}
				>
					<Icon name="plus" height={20} width={20} />
					Add Your First Chart
				</button>
			</div>
		</div>
	)
}
