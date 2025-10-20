import * as React from 'react'
import { Popover, PopoverDisclosure, usePopoverStore } from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import { CustomView } from '../../types'
import { ProTableCSVButton } from './CsvButton'
import { CustomViewModal } from './CustomViewModal'
import { ColumnPresetDefinition } from './useProTable'

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
	currentColumns?: Record<string, boolean>
	columnOrder?: string[]
	customColumns?: any[]
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
	customViews = [],
	onSaveView,
	onLoadView,
	onDeleteView
}: TableHeaderProps) {
	const [showSaveModal, setShowSaveModal] = React.useState(false)
	const displayTitle = React.useMemo(() => {
		if (chains.length === 0) return 'All Protocols'
		if (chains.length === 1) return `${chains[0]} Protocols`
		if (chains.length <= 3) return `${chains.join(', ')} Protocols`
		return `${chains.length} Chains Protocols`
	}, [chains])
	const [showCustomViewDropdown, setShowCustomViewDropdown] = React.useState(false)
	const dropdownRef = React.useRef<HTMLDivElement>(null)

	const activeCustomView = customViews.find((v) => v.id === activePreset)
	const datasetPresets = React.useMemo(
		() =>
			columnPresets.filter(
				(preset) => preset.group === 'dataset' || preset.group === undefined || preset.group === null
			),
		[columnPresets]
	)

	const datasetPopover = usePopoverStore({ placement: 'bottom-start' })

	const visibleDatasets = React.useMemo(() => datasetPresets.slice(0, 3), [datasetPresets])
	const moreDatasets = React.useMemo(() => datasetPresets.slice(3), [datasetPresets])

	React.useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setShowCustomViewDropdown(false)
			}
		}

		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [])

	return (
		<div className="mb-2 flex flex-wrap items-center gap-2">
			<h3 className="mr-auto text-base font-semibold">{displayTitle}</h3>

			{colSpan === 2 && (
				<div className="flex flex-nowrap items-center gap-2 overflow-x-auto" role="group">
					<span className="pro-text3 text-[11px] font-semibold tracking-wide uppercase">Datasets</span>
					{datasetPresets.length === 0 ? (
						<span className="pro-text3 text-xs italic">No datasets available</span>
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
												: 'pro-border pro-hover-bg pro-text1 pro-bg1'
										}`}
										title={preset.description}
										aria-pressed={isActive}
									>
										{preset.label}
									</button>
								)
							})}
							{moreDatasets.length > 0 && (
								<>
									<PopoverDisclosure
										store={datasetPopover}
										className={`flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${
											moreDatasets.some((p) => p.id === activePreset)
												? 'border-(--primary) bg-(--primary) text-white'
												: 'pro-border pro-hover-bg pro-text1 pro-bg1'
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
										className="pro-dashboard z-50 w-[260px] rounded-lg border border-(--cards-border) bg-(--cards-bg) shadow-xl"
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
														{preset.icon && <span className="mt-0.5 text-xl leading-none">{preset.icon}</span>}
														<div className="min-w-0 flex-1">
															<div className="mb-1 flex items-center justify-between gap-2">
																<span
																	className={`text-sm font-semibold ${isActive ? 'text-(--primary)' : 'pro-text1'}`}
																>
																	{preset.label}
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
															<p className="pro-text3 text-xs leading-snug opacity-80">{preset.description}</p>
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
			)}

			<div className="relative" ref={dropdownRef}>
				<button
					type="button"
					onClick={() => setShowCustomViewDropdown(!showCustomViewDropdown)}
					className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ${
						activeCustomView
							? 'border-(--primary) bg-(--primary) text-white'
							: 'pro-border pro-hover-bg pro-text1 pro-bg1'
					}`}
				>
					<Icon name="eye" height={14} width={14} />
					<span>{activeCustomView ? activeCustomView.name : 'Custom Views'}</span>
					<Icon name={showCustomViewDropdown ? 'chevron-up' : 'chevron-down'} height={12} width={12} />
					{customViews.length > 0 && !activeCustomView && (
						<span className="bg-pro-blue-100 text-pro-blue-400 dark:bg-pro-blue-300/20 dark:text-pro-blue-200 ml-1 rounded-full px-1.5 py-0.5 text-xs">
							{customViews.length}
						</span>
					)}
				</button>

				{showCustomViewDropdown && (
					<div
						className="pro-bg3 pro-divider absolute top-full right-0 mt-1 min-w-[200px] rounded-md border shadow-lg"
						style={{ zIndex: 9999 }}
					>
						{customViews.length > 0 ? (
							<>
								<div className="pro-text3 border-b border-(--bg-divider) px-3 py-2 text-xs font-medium uppercase">
									Saved Views
								</div>
								{customViews.map((view) => (
									<div
										key={view.id}
										className="pro-hover-bg flex items-center justify-between px-3 py-2 transition-colors"
									>
										<button
											onClick={() => {
												onLoadView?.(view.id)
												setShowCustomViewDropdown(false)
											}}
											className="pro-text1 flex flex-1 items-center gap-2 text-left text-sm"
										>
											<span>{view.name}</span>
											{activeCustomView?.id === view.id && (
												<Icon name="check" height={12} width={12} className="text-(--success)" />
											)}
										</button>
										<Tooltip content="Delete view">
											<button
												onClick={(e) => {
													e.stopPropagation()
													if (confirm(`Delete view "${view.name}"?`)) {
														onDeleteView?.(view.id)
													}
												}}
												className="pro-text3 rounded-md p-1 transition-colors hover:text-(--error)"
											>
												<Icon name="trash-2" height={12} width={12} />
											</button>
										</Tooltip>
									</div>
								))}
								<div className="border-t border-(--bg-divider) p-2">
									<button
										onClick={() => {
											setShowSaveModal(true)
											setShowCustomViewDropdown(false)
										}}
										className="pro-hover-bg pro-text1 flex w-full items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors"
									>
										<Icon name="plus" height={14} width={14} />
										<span>Save Current View</span>
									</button>
								</div>
							</>
						) : (
							<div className="p-4 text-center">
								<p className="pro-text3 mb-3 text-sm">No custom views yet</p>
								<button
									onClick={() => {
										setShowSaveModal(true)
										setShowCustomViewDropdown(false)
									}}
									className="pro-border pro-hover-bg pro-text1 flex w-full items-center justify-center gap-2 rounded-md border py-2 text-sm font-medium transition-colors"
								>
									<Icon name="plus" height={14} width={14} />
									<span>Save Current View</span>
								</button>
							</div>
						)}
					</div>
				)}
			</div>

			<ProTableCSVButton onClick={downloadCSV} smol />

			<Tooltip
				content="Create custom calculated columns with formulas like 'tvl / mcap' or '(fees_24h + revenue_24h) * 365'"
				render={<button onClick={() => setShowColumnPanel(!showColumnPanel)} />}
				className="pro-border pro-hover-bg pro-text1 pro-bg1 relative flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors"
			>
				<Icon name="settings" height={14} width={14} />
				<span className="flex items-center gap-1">
					Customize Table
					<span className="rounded-md bg-(--primary) px-1.5 py-0.5 text-xs text-white">+ Custom Columns</span>
				</span>
				<Icon name={showColumnPanel ? 'chevron-up' : 'chevron-down'} height={12} width={12} />
			</Tooltip>

			{onSaveView && (
				<CustomViewModal
					isOpen={showSaveModal}
					onClose={() => setShowSaveModal(false)}
					onSave={(name) => {
						onSaveView(name)
						setShowSaveModal(false)
					}}
					existingViewNames={customViews.map((v) => v.name)}
				/>
			)}
		</div>
	)
}
