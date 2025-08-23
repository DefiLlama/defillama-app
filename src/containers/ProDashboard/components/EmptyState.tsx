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
		<div className="py-16 text-center">
			<div className="pro-glass mx-auto max-w-lg p-12">
				<div className="mb-6">
					<Icon name="bar-chart-2" height={64} width={64} className="pro-text3 mx-auto opacity-50" />
				</div>
				<h2 className="pro-text1 mb-3 text-2xl font-semibold">No charts added yet</h2>
				<p className="pro-text2 mb-6 text-lg">
					Start building your dashboard by adding charts{showAIGeneration ? ' manually or generate with LlamaAI' : ' manually'}
				</p>
				<div className="flex flex-col sm:flex-row gap-4 justify-center">
					{showAIGeneration && (
						<button
							className="flex items-center gap-2 border border-(--primary) text-(--primary) px-6 py-3 text-base font-medium hover:bg-(--primary) hover:text-white transition-colors"
							onClick={onGenerateWithAI}
						>
							<Icon name="sparkles" height={20} width={20} />
							Generate with LlamaAI
						</button>
					)}
					<button
						className="flex items-center gap-2 bg-(--primary) px-6 py-3 text-base font-medium text-white hover:bg-(--primary-hover)"
						onClick={onAddChart}
					>
						<Icon name="plus" height={20} width={20} />
						Add Your First Chart
					</button>
				</div>
			</div>
		</div>
	)
}
