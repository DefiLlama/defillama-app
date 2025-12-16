import { Icon } from '~/components/Icon'
import type { MetricWithAvailability } from '../types'

interface MetricCardProps {
	metric: MetricWithAvailability
	isSelected: boolean
	onToggle: () => void
	disabled?: boolean
	itemLabel?: string
}

export function MetricCard({ metric, isSelected, onToggle, disabled, itemLabel = 'items' }: MetricCardProps) {
	const isDisabled = disabled || !metric.isValid

	return (
		<button
			type="button"
			onClick={onToggle}
			disabled={isDisabled}
			className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all ${
				isSelected
					? 'border-(--primary) bg-(--primary)/5 ring-1 ring-(--primary)/20'
					: isDisabled
						? 'cursor-not-allowed border-(--cards-border) bg-(--cards-bg-alt)/30 opacity-50'
						: 'border-(--cards-border) bg-(--cards-bg) hover:border-(--primary)/40 hover:bg-(--cards-bg-alt)/50'
			}`}
		>
			<div
				className={`flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded border transition-colors ${
					isSelected ? 'border-(--primary) bg-(--primary)' : 'border-(--form-control-border) bg-(--bg-input)'
				}`}
			>
				{isSelected && <Icon name="check" height={10} width={10} className="text-white" />}
			</div>

			<div className="min-w-0 flex-1">
				<span className="text-sm font-medium text-(--text-primary)">{metric.title}</span>
				<div className="flex items-center gap-1.5 text-xs text-(--text-tertiary)">
					<span className="capitalize">{metric.chartType}</span>
					<span>•</span>
					<span className={metric.isValid ? 'text-(--text-secondary)' : 'text-red-500'}>
						{metric.availableCount}/{metric.totalCount} {itemLabel}
					</span>
				</div>
			</div>
		</button>
	)
}
