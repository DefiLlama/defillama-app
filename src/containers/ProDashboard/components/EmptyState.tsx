import { Icon } from '~/components/Icon'
import { useFeatureFlagsContext } from '~/contexts/FeatureFlagsContext'

interface EmptyStateProps {
	onAddChart: () => void
	onGenerateWithAI?: () => void
}

export function EmptyState({ onAddChart, onGenerateWithAI }: EmptyStateProps) {
	const { hasFeature, loading: featureFlagsLoading } = useFeatureFlagsContext()
	const showAIGeneration = !featureFlagsLoading && hasFeature('dashboard-gen') && onGenerateWithAI

	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) px-1 py-12">
			<Icon name="bar-chart-2" height={48} width={48} className="text-(--text-label)" />
			<h1 className="text-3xl font-bold">No charts added yet</h1>
			<p className="text-center text-base text-(--text-label)">
				Start building your dashboard by adding charts
				{showAIGeneration ? ' manually or generate with LlamaAI' : ' manually'}
			</p>
			<div className="mt-7 flex flex-col justify-center gap-4 sm:flex-row">
				{showAIGeneration && (
					<button
						className="pro-btn-blue flex items-center gap-1 rounded-md px-6 py-3 font-medium"
						onClick={onGenerateWithAI}
					>
						<Icon name="sparkles" height={20} width={20} />
						Generate with LlamaAI
					</button>
				)}
				<button
					className="pro-btn-purple flex items-center gap-1 rounded-md px-6 py-3 font-medium"
					onClick={onAddChart}
				>
					<Icon name="plus" height={20} width={20} />
					Add Your First Chart
				</button>
			</div>
		</div>
	)
}
