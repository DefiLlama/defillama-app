import { Icon } from '~/components/Icon'
import type { WizardStep } from '../types'
import { getStepIndex, WIZARD_STEPS } from '../types'

interface WizardNavigationProps {
	currentStep: WizardStep
	canProceed: boolean
	canGoBack: boolean
	onNext: () => void
	onBack: () => void
	onGenerate?: () => void
	isGenerating?: boolean
}

const STEP_LABELS: Record<WizardStep, string> = {
	'select-type': 'Type',
	'select-items': 'Items',
	'select-metrics': 'Metrics',
	preview: 'Preview'
}

export function WizardNavigation({
	currentStep,
	canProceed,
	canGoBack,
	onNext,
	onBack,
	onGenerate,
	isGenerating
}: WizardNavigationProps) {
	const currentIndex = getStepIndex(currentStep)
	const isLastStep = currentStep === 'preview'

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-center gap-2">
				{WIZARD_STEPS.map((step, index) => {
					const isActive = index === currentIndex
					const isCompleted = index < currentIndex
					return (
						<div key={step} className="flex items-center gap-2">
							<div
								className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
									isActive
										? 'bg-(--primary) text-white'
										: isCompleted
											? 'bg-(--primary)/20 text-(--primary)'
											: 'bg-(--cards-bg-alt) text-(--text-tertiary)'
								}`}
							>
								{isCompleted ? <Icon name="check" height={14} width={14} /> : index + 1}
							</div>
							<span
								className={`hidden text-xs sm:inline ${isActive ? 'font-medium text-(--text-primary)' : 'text-(--text-tertiary)'}`}
							>
								{STEP_LABELS[step]}
							</span>
							{index < WIZARD_STEPS.length - 1 && (
								<div className={`h-px w-8 ${isCompleted ? 'bg-(--primary)/40' : 'bg-(--cards-border)'}`} />
							)}
						</div>
					)
				})}
			</div>

			<div className="flex items-center justify-between gap-3 border-t border-(--cards-border) pt-4">
				<button
					type="button"
					onClick={onBack}
					disabled={!canGoBack}
					className="flex items-center gap-1.5 rounded-md border border-(--form-control-border) px-4 py-2 text-sm font-medium text-(--text-secondary) transition-colors hover:border-(--primary)/40 hover:text-(--text-primary) disabled:cursor-not-allowed disabled:opacity-50"
				>
					<Icon name="arrow-left" height={14} width={14} />
					Back
				</button>

				{isLastStep ? (
					<button
						type="button"
						onClick={onGenerate}
						disabled={!canProceed || isGenerating}
						className="flex items-center gap-1.5 rounded-md bg-(--primary) px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-(--primary)/90 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{isGenerating ? (
							<>
								<div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
								Creating...
							</>
						) : (
							<>
								<Icon name="plus" height={14} width={14} />
								Create Dashboard
							</>
						)}
					</button>
				) : (
					<button
						type="button"
						onClick={onNext}
						disabled={!canProceed}
						className="flex items-center gap-1.5 rounded-md bg-(--primary) px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-(--primary)/90 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Next
						<Icon name="arrow-right" height={14} width={14} />
					</button>
				)}
			</div>
		</div>
	)
}
