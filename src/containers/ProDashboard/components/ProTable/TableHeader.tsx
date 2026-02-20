'use no memo'

import { Popover, PopoverDisclosure, useDialogStore, usePopoverStore } from '@ariakit/react'
import * as React from 'react'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import type { CustomView } from '../../types'
import { ProTableCSVButton } from './CsvButton'
import { CustomViewModal } from './CustomViewModal'
import type { ColumnPresetDefinition } from './proTable.types'

const EMPTY_CUSTOM_VIEWS: CustomView[] = []

interface TableHeaderProps {
	chains: string[]
	columnPresets: ColumnPresetDefinition[]
	applyPreset: (presetName: string) => void
	activePreset: string | null
	showColumnPanel: boolean
	setShowColumnPanel: (show: boolean) => void
	downloadCSV: () => void
	colSpan?: 1 | 2
	customViews?: CustomView[]
	onSaveView?: (name: string) => void
	onLoadView?: (viewId: string) => void
	onDeleteView?: (viewId: string) => void
}

export function TableHeader({
	chains,
	columnPresets,
	applyPreset,
	activePreset,
	showColumnPanel,
	setShowColumnPanel,
	downloadCSV,
	colSpan = 2,
	customViews = EMPTY_CUSTOM_VIEWS,
	onSaveView,
	onLoadView,
	onDeleteView
}: TableHeaderProps) {
	const displayTitle = React.useMemo(() => {
		if (chains.length === 0) return 'All Protocols'
		if (chains.length === 1) return `${chains[0]} Protocols`
		if (chains.length <= 3) return `${chains.join(', ')} Protocols`
		return `${chains.length} Chains Protocols`
	}, [chains])

	const activeCustomView = React.useMemo(
		() => customViews.find((view) => view.id === activePreset) ?? null,
		[activePreset, customViews]
	)
	const existingViewNames = React.useMemo(() => customViews.map((view) => view.name), [customViews])
	const datasetPresets = React.useMemo(
		() => columnPresets.filter((preset) => preset.group === 'dataset' || preset.group === undefined),
		[columnPresets]
	)
	const visibleDatasets = React.useMemo(() => datasetPresets.slice(0, 3), [datasetPresets])
	const moreDatasets = React.useMemo(() => datasetPresets.slice(3), [datasetPresets])

	const datasetPopover = usePopoverStore({ placement: 'bottom-start' })
	const customViewsPopover = usePopoverStore({ placement: 'bottom-end' })
	const saveViewDialogStore = useDialogStore()

	return (
		<div className="mb-2 flex flex-wrap items-center gap-2">
			<h3 className="mr-auto text-base font-semibold">{displayTitle}</h3>

			{colSpan === 2 ? (
				<div className="flex flex-nowrap items-center gap-2 overflow-x-auto" role="group">
					<span className="text-[11px] font-semibold tracking-wide pro-text3 uppercase">Datasets</span>
					{datasetPresets.length === 0 ? (
						<span className="text-xs pro-text3 italic">No datasets available</span>
					) : (
						<>
							{visibleDatasets.map((preset) => {
								const isActive = activePreset === preset.id
								return (
									<button
										key={preset.id}
										type="button"
										onClick={() => applyPreset(preset.id)}
										className={`flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${
											isActive
												? 'border-(--primary) bg-(--primary) text-white'
												: 'pro-border pro-bg1 pro-hover-bg pro-text1'
										}`}
										title={preset.description}
										aria-pressed={isActive}
									>
										{preset.label}
									</button>
								)
							})}
							{moreDatasets.length > 0 ? (
								<>
									<PopoverDisclosure
										store={datasetPopover}
										className={`flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${
											moreDatasets.some((preset) => preset.id === activePreset)
												? 'border-(--primary) bg-(--primary) text-white'
												: 'pro-border pro-bg1 pro-hover-bg pro-text1'
										}`}
									>
										More...
										<Icon name="chevron-down" height={12} width={12} />
									</PopoverDisclosure>
									<Popover
										store={datasetPopover}
										modal={false}
										portal={true}
										gutter={4}
										className="z-50 w-[260px] rounded-lg border pro-dashboard border-(--cards-border) bg-(--cards-bg) shadow-xl"
									>
										<div className="thin-scrollbar max-h-[420px] overflow-y-auto p-1.5">
											{moreDatasets.map((preset) => {
												const isActive = activePreset === preset.id
												return (
													<button
														key={preset.id}
														type="button"
														onClick={() => {
															applyPreset(preset.id)
															datasetPopover.setOpen(false)
														}}
														className={`flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-(--cards-bg-alt) ${
															isActive ? 'bg-(--primary)/10 ring-1 ring-(--primary)/20' : ''
														}`}
													>
														{preset.icon ? <span className="mt-0.5 text-xl leading-none">{preset.icon}</span> : null}
														<div className="min-w-0 flex-1">
															<div className="mb-1 flex items-center justify-between gap-2">
																<span
																	className={`text-sm font-semibold ${isActive ? 'text-(--primary)' : 'pro-text1'}`}
																>
																	{preset.label}
																</span>
																{isActive ? (
																	<Icon name="check" width={14} height={14} className="shrink-0 text-(--primary)" />
																) : null}
															</div>
															<p className="text-xs leading-snug pro-text3 opacity-80">{preset.description}</p>
														</div>
													</button>
												)
											})}
										</div>
									</Popover>
								</>
							) : null}
						</>
					)}
				</div>
			) : null}

			<PopoverDisclosure
				store={customViewsPopover}
				className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ${
					activeCustomView
						? 'border-(--primary) bg-(--primary) text-white'
						: 'pro-border pro-bg1 pro-hover-bg pro-text1'
				}`}
			>
				<Icon name="eye" height={14} width={14} />
				<span>{activeCustomView ? activeCustomView.name : 'Custom Views'}</span>
				<Icon name="chevron-down" height={12} width={12} />
				{customViews.length > 0 && !activeCustomView ? (
					<span className="ml-1 rounded-full bg-pro-blue-100 px-1.5 py-0.5 text-xs text-pro-blue-400 dark:bg-pro-blue-300/20 dark:text-pro-blue-200">
						{customViews.length}
					</span>
				) : null}
			</PopoverDisclosure>

			<Popover
				store={customViewsPopover}
				modal={false}
				portal={true}
				gutter={4}
				className="z-50 min-w-[220px] rounded-md border pro-divider bg-(--cards-bg) pro-bg3 shadow-lg"
			>
				{customViews.length > 0 ? (
					<>
						<div className="border-b border-(--bg-divider) px-3 py-2 text-xs font-medium pro-text3 uppercase">
							Saved Views
						</div>
						{customViews.map((view) => {
							const isActive = activeCustomView?.id === view.id
							return (
								<div
									key={view.id}
									className="flex items-center justify-between pro-hover-bg px-3 py-2 transition-colors"
								>
									<button
										type="button"
										onClick={() => {
											onLoadView?.(view.id)
											customViewsPopover.setOpen(false)
										}}
										className="flex flex-1 items-center gap-2 text-left text-sm pro-text1"
									>
										<span>{view.name}</span>
										{isActive ? <Icon name="check" height={12} width={12} className="text-(--success)" /> : null}
									</button>
									<Tooltip content="Delete view">
										<button
											type="button"
											onClick={(event) => {
												event.stopPropagation()
												if (confirm(`Delete view "${view.name}"?`)) {
													onDeleteView?.(view.id)
												}
											}}
											className="rounded-md p-1 pro-text3 transition-colors hover:text-(--error)"
										>
											<Icon name="trash-2" height={12} width={12} />
										</button>
									</Tooltip>
								</div>
							)
						})}
						{onSaveView ? (
							<div className="border-t border-(--bg-divider) p-2">
								<button
									type="button"
									onClick={() => {
										saveViewDialogStore.setOpen(true)
										customViewsPopover.setOpen(false)
									}}
									className="flex w-full items-center justify-center gap-2 rounded-md pro-hover-bg py-2 text-sm font-medium pro-text1 transition-colors"
								>
									<Icon name="plus" height={14} width={14} />
									<span>Save Current View</span>
								</button>
							</div>
						) : null}
					</>
				) : (
					<div className="p-4 text-center">
						<p className="mb-3 text-sm pro-text3">No custom views yet</p>
						{onSaveView ? (
							<button
								type="button"
								onClick={() => {
									saveViewDialogStore.setOpen(true)
									customViewsPopover.setOpen(false)
								}}
								className="flex w-full items-center justify-center gap-2 rounded-md border pro-border pro-hover-bg py-2 text-sm font-medium pro-text1 transition-colors"
							>
								<Icon name="plus" height={14} width={14} />
								<span>Save Current View</span>
							</button>
						) : null}
					</div>
				)}
			</Popover>

			<ProTableCSVButton onClick={downloadCSV} smol />

			<Tooltip
				content="Create custom calculated columns with formulas like 'tvl / mcap' or '(fees_24h + revenue_24h) * 365'"
				render={<button type="button" onClick={() => setShowColumnPanel(!showColumnPanel)} />}
				className="relative flex items-center gap-2 rounded-md border pro-border pro-bg1 pro-hover-bg px-3 py-1.5 text-sm pro-text1 transition-colors"
			>
				<Icon name="settings" height={14} width={14} />
				<span className="flex items-center gap-1">
					Customize Table
					<span className="rounded-md bg-(--primary) px-1.5 py-0.5 text-xs text-white">+ Custom Columns</span>
				</span>
				<Icon name={showColumnPanel ? 'chevron-up' : 'chevron-down'} height={12} width={12} />
			</Tooltip>

			{onSaveView ? (
				<CustomViewModal dialogStore={saveViewDialogStore} onSave={onSaveView} existingViewNames={existingViewNames} />
			) : null}
		</div>
	)
}
