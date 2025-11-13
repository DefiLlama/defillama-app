import { useMemo } from 'react'
import { Icon } from '~/components/Icon'
import type { UnifiedTableConfig } from '~/containers/ProDashboard/types'
import { useProDashboard } from '../../../../ProDashboardAPIContext'
import { UnifiedTable } from '../../../UnifiedTable'
import { useUnifiedTableWizardContext } from '../WizardContext'

interface PreviewConfirmStepProps {
	onBack: () => void
	onClose: () => void
}

export function PreviewConfirmStep({ onBack, onClose }: PreviewConfirmStepProps) {
	const { handleAddUnifiedTable } = useProDashboard()
	const {
		state: { columnOrder, columnVisibility, sorting },
		actions: { setSorting, setPreset },
		derived: { draftConfig }
	} = useUnifiedTableWizardContext()

	const previewConfig = useMemo<UnifiedTableConfig>(
		() => ({
			id: 'preview',
			kind: 'unified-table',
			strategyType: draftConfig.strategyType ?? 'protocols',
			rowHeaders: draftConfig.rowHeaders ?? ['parent-protocol', 'protocol'],
			params: draftConfig.params ?? { chains: ['All'] },
			filters: draftConfig.filters,
			columnOrder: draftConfig.columnOrder ?? columnOrder,
			columnVisibility: draftConfig.columnVisibility ?? columnVisibility,
			defaultSorting: draftConfig.defaultSorting ?? sorting,
			activePresetId: draftConfig.activePresetId
		}),
		[draftConfig, columnOrder, columnVisibility, sorting]
	)

	const handleAdd = () => {
		handleAddUnifiedTable(draftConfig)
		onClose()
	}

	return (
		<div className="flex h-full flex-col gap-4">
			<div className="flex flex-1 flex-col gap-3 overflow-hidden">
				<div className="flex items-center justify-between">
					<div className="flex flex-col">
						<h3 className="text-sm font-semibold text-(--text-primary)">Preview</h3>
						<p className="text-xs text-(--text-secondary)">
							This preview mirrors the unified table that will be added to your dashboard.
						</p>
					</div>
				</div>

				<div className="flex-1 overflow-hidden rounded-lg border border-(--cards-border)">
					<UnifiedTable
						config={previewConfig}
						previewMode
						columnOrderOverride={previewConfig.columnOrder}
						columnVisibilityOverride={previewConfig.columnVisibility ?? {}}
						sortingOverride={previewConfig.defaultSorting ?? sorting}
						onPreviewSortingChange={setSorting}
						onPresetChange={setPreset}
					/>
				</div>
			</div>

			<div className="sticky right-0 bottom-0 left-0 flex w-full items-center justify-end gap-3 border-t border-(--cards-border) bg-(--cards-bg) pt-3 pb-4 shadow-[0_-8px_16px_rgba(10,13,20,0.25)]/10">
				<button
					type="button"
					onClick={onBack}
					className="pro-border pro-text2 hover:pro-text1 pro-hover-bg rounded-md border px-4 py-2 text-sm transition"
				>
					Back
				</button>
				<button
					type="button"
					onClick={handleAdd}
					className="pro-btn-blue flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold"
				>
					Add Table
					<Icon name="arrow-right" height={14} width={14} />
				</button>
			</div>
		</div>
	)
}
