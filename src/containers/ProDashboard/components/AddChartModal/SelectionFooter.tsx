import { memo } from 'react'
import { Icon } from '~/components/Icon'
import { CHART_TYPES, ChartConfig } from '../../types'

interface SelectionFooterProps {
	composerItems: ChartConfig[]
	chartCreationMode: 'separate' | 'combined'
	unifiedChartName: string
	onChartCreationModeChange: (mode: 'separate' | 'combined') => void
	onUnifiedChartNameChange: (name: string) => void
	onComposerItemColorChange: (id: string, color: string) => void
	onRemoveFromComposer: (id: string) => void
}

export const SelectionFooter = memo(function SelectionFooter({
	composerItems,
	chartCreationMode,
	unifiedChartName,
	onChartCreationModeChange,
	onUnifiedChartNameChange,
	onComposerItemColorChange,
	onRemoveFromComposer
}: SelectionFooterProps) {
	if (composerItems.length === 0) {
		return null
	}

	return (
		<div className="flex-shrink-0 space-y-2">
			{chartCreationMode === 'combined' && (
				<input
					type="text"
					value={unifiedChartName}
					onChange={(e) => onUnifiedChartNameChange(e.target.value)}
					placeholder="Chart name..."
					className="pro-text1 placeholder:pro-text3 w-full rounded border border-(--form-control-border) bg-(--bg-input) px-2 py-1.5 text-xs focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
				/>
			)}
			<div className="thin-scrollbar flex flex-wrap items-center gap-2">
				<label className="pro-text2 flex shrink-0 cursor-pointer items-center gap-1.5 text-xs">
					<input
						type="checkbox"
						checked={chartCreationMode === 'combined'}
						onChange={() => onChartCreationModeChange(chartCreationMode === 'combined' ? 'separate' : 'combined')}
						className="h-3.5 w-3.5 rounded border-gray-600 bg-transparent"
					/>
					<span>Multi-Chart</span>
				</label>
				{composerItems.map((item) => (
					<div
						key={item.id}
						className="flex shrink-0 items-center gap-1.5 rounded-md border border-(--cards-border) bg-(--cards-bg) px-2 py-1 text-xs"
					>
						<span className="pro-text1">
							{item.protocol || item.chain} - {CHART_TYPES[item.type]?.title || item.type}
						</span>
						<input
							type="color"
							value={item.color || CHART_TYPES[item.type]?.color || '#3366ff'}
							onChange={(e) => onComposerItemColorChange(item.id, e.target.value)}
							className="h-5 w-5 cursor-pointer rounded border border-(--cards-border) bg-transparent p-0"
							aria-label="Select chart color"
						/>
						<button
							onClick={() => onRemoveFromComposer(item.id)}
							className="pro-text3 transition-colors hover:text-red-500"
							title="Remove from selection"
						>
							<Icon name="x" height={12} width={12} />
						</button>
					</div>
				))}
			</div>
			<div className="pro-text3 text-[10px]">
				{chartCreationMode === 'combined'
					? `Create 1 multi-chart with ${composerItems.length} chart${composerItems.length !== 1 ? 's' : ''}`
					: `Create ${composerItems.length} separate chart${composerItems.length !== 1 ? 's' : ''}`}
			</div>
		</div>
	)
})
