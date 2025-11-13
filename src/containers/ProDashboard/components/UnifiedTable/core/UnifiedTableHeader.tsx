import { Popover, PopoverDisclosure, usePopoverStore } from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { ProTableCSVButton } from '../../ProTable/CsvButton'
import type { UnifiedTablePreset } from '../config/PresetRegistry'

const INLINE_PRESET_LIMIT = 3

export interface UnifiedTableHeaderProps {
	title: string
	scopeDescription: string
	rowHeadersSummary: string | null
	activePreset: UnifiedTablePreset | null
	availablePresets: UnifiedTablePreset[]
	onPresetChange?: (presetId: string) => void
	onCustomizeColumns?: () => void
	onCsvExport?: () => void
	isExportDisabled?: boolean
	isLoading?: boolean
}

export function UnifiedTableHeader({
	title,
	scopeDescription,
	rowHeadersSummary,
	activePreset,
	availablePresets,
	onPresetChange,
	onCustomizeColumns,
	onCsvExport,
	isExportDisabled = false,
	isLoading = false
}: UnifiedTableHeaderProps) {
	const inlinePresets = availablePresets.slice(0, INLINE_PRESET_LIMIT)
	const extraPresets = availablePresets.slice(INLINE_PRESET_LIMIT)
	const datasetPopover = usePopoverStore({ placement: 'bottom-start' })

	const presetButtonsDisabled = !onPresetChange
	const csvDisabled = isExportDisabled || !onCsvExport
	const customizeDisabled = !onCustomizeColumns

	const handlePresetClick = (presetId: string) => {
		if (!onPresetChange) return
		onPresetChange(presetId)
	}

	return (
		<div className="mb-3 flex flex-col gap-3">
			<div className="flex flex-col gap-1">
				<div className="flex flex-wrap items-center gap-2">
					<h3 className="text-base font-semibold text-(--text-primary)">{title}</h3>
					{activePreset && (
						<span className="rounded-full bg-(--primary)/10 px-2 py-0.5 text-xs font-medium text-(--primary)">
							{activePreset.name}
						</span>
					)}
				</div>
				<div className="flex flex-wrap gap-2 text-xs text-(--text-secondary)">
					<span>{scopeDescription}</span>
					{rowHeadersSummary && (
						<>
							<span>•</span>
							<span>Grouped by {rowHeadersSummary}</span>
						</>
					)}
				</div>
			</div>

			<div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
				<div className="flex flex-1 flex-wrap items-center gap-2 overflow-x-auto" role="group">
					<span className="pro-text3 text-[11px] font-semibold uppercase tracking-wide">Datasets</span>
					{availablePresets.length === 0 ? (
						<span className="text-xs text-(--text-tertiary)">No presets available</span>
					) : (
						<>
							{inlinePresets.map((preset) => {
								const isActive = activePreset?.id === preset.id
								return (
									<button
										key={preset.id}
										type="button"
										onClick={() => handlePresetClick(preset.id)}
										disabled={presetButtonsDisabled}
										className={`flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm transition-colors ${
											isActive
												? 'border-(--primary) bg-(--primary) text-white'
												: 'pro-border pro-bg1 pro-hover-bg pro-text1'
										} ${presetButtonsDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
										title={preset.description}
										aria-pressed={isActive}
									>
										{preset.name}
									</button>
								)
							})}
							{extraPresets.length > 0 && (
								<>
									<PopoverDisclosure
										store={datasetPopover}
										disabled={presetButtonsDisabled}
										className={`flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm transition-colors ${
											extraPresets.some((preset) => preset.id === activePreset?.id)
												? 'border-(--primary) bg-(--primary) text-white'
												: 'pro-border pro-bg1 pro-hover-bg pro-text1'
										} ${presetButtonsDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
									>
										<span>More...</span>
										<Icon name="chevron-down" height={12} width={12} />
									</PopoverDisclosure>
									<Popover
										store={datasetPopover}
										modal={false}
										portal={true}
										className="pro-dashboard z-50 w-64 rounded-lg border border-(--cards-border) bg-(--cards-bg) shadow-xl"
									>
										<div className="thin-scrollbar max-h-[360px] overflow-y-auto p-1.5">
											{extraPresets.map((preset) => {
												const isActive = activePreset?.id === preset.id
												return (
													<button
														key={preset.id}
														type="button"
														onClick={() => {
															handlePresetClick(preset.id)
															datasetPopover.setOpen(false)
														}}
														disabled={presetButtonsDisabled}
														className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-(--cards-bg-alt) ${
															isActive ? 'bg-(--primary)/10 ring-1 ring-(--primary)/20' : ''
														} ${presetButtonsDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
													>
														<div className="min-w-0 flex-1">
															<div className="mb-1 flex items-center justify-between gap-2">
																<span
																	className={`text-sm font-semibold ${
																		isActive ? 'text-(--primary)' : 'pro-text1'
																	}`}
																>
																	{preset.name}
																</span>
																{isActive && (
																	<Icon
																		name="check"
																		width={14}
																		height={14}
																		className="flex-shrink-0 text-(--primary)"
																	/>
																)}
															</div>
															<p className="pro-text3 text-xs leading-snug opacity-80">
																{preset.description}
															</p>
														</div>
													</button>
												)
											})}
										</div>
									</Popover>
								</>
							)}
						</>
					)}
				</div>

				<div className="flex flex-shrink-0 flex-wrap items-center gap-2">
					<button
						type="button"
						onClick={() => onCustomizeColumns?.()}
						disabled={customizeDisabled}
		className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ${
			customizeDisabled
				? 'cursor-not-allowed border-(--cards-border) text-(--text-tertiary)'
				: 'pro-border pro-bg1 pro-hover-bg pro-text1'
		}`}
					>
						<Icon name="settings" height={14} width={14} />
						<span>Customize Columns</span>
					</button>
					<ProTableCSVButton
						onClick={() => {
							if (csvDisabled) return
							onCsvExport?.()
						}}
						isLoading={isLoading}
						className={`pro-border pro-bg1 pro-hover-bg pro-text1 flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ${
							csvDisabled ? 'cursor-not-allowed opacity-60' : ''
						}`}
					/>
				</div>
			</div>
		</div>
	)
}
