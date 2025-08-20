import { Icon } from '~/components/Icon'

interface EmptyStateProps {
	onAddChart: () => void
}

export function EmptyState({ onAddChart }: EmptyStateProps) {
	return (
		<div className="py-16 text-center">
			<div className="pro-glass mx-auto max-w-lg p-12">
				<div className="mb-6">
					<Icon name="bar-chart-2" height={64} width={64} className="pro-text3 mx-auto opacity-50" />
				</div>
				<h2 className="pro-text1 mb-3 text-2xl font-semibold">No charts added yet</h2>
				<p className="pro-text2 mb-6 text-lg">Click the "Add Item" button to start building your dashboard</p>
				<button
					className="mx-auto flex items-center gap-2 bg-(--primary) px-6 py-3 text-base font-medium text-white hover:bg-(--primary-hover)"
					onClick={onAddChart}
				>
					<Icon name="plus" height={20} width={20} />
					Add Your First Chart
				</button>
			</div>
		</div>
	)
}
