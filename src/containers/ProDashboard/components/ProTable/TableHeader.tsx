import * as React from 'react'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import { CustomView } from '../../types'
import { ProTableCSVButton } from './CsvButton'
import { CustomViewModal } from './CustomViewModal'

interface TableHeaderProps {
	chains: string[]
	columnPresets: Record<string, string[]>
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
	const isPresetActive = Object.keys(columnPresets).includes(activePreset as string)

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
		<div className="mb-2 flex flex-wrap items-center justify-between gap-2">
			<h3 className="mr-auto text-base font-semibold">{displayTitle}</h3>

			{colSpan === 2 && (
				<div className="flex items-center gap-2">
					{Object.keys(columnPresets).map((preset) => (
						<button
							key={preset}
							onClick={() => applyPreset(preset)}
							className={`flex items-center gap-1 border px-3 py-1.5 text-sm capitalize transition-colors ${
								isPresetActive && activePreset === preset
									? 'border-(--primary) bg-(--primary) text-white'
									: 'pro-border pro-hover-bg pro-text1 pro-bg1'
							}`}
						>
							{preset}
						</button>
					))}

					<div className="relative" ref={dropdownRef}>
						<button
							onClick={() => setShowCustomViewDropdown(!showCustomViewDropdown)}
							className={`flex items-center gap-2 border px-3 py-1.5 text-sm transition-colors ${
								activeCustomView
									? 'border-(--primary) bg-(--primary) text-white'
									: 'pro-border pro-hover-bg pro-text1 pro-bg1'
							}`}
						>
							<Icon name="eye" height={14} width={14} />
							<span>{activeCustomView ? activeCustomView.name : 'Custom Views'}</span>
							<Icon name={showCustomViewDropdown ? 'chevron-up' : 'chevron-down'} height={12} width={12} />
							{customViews.length > 0 && !activeCustomView && (
								<span className="ml-1 rounded-full bg-blue-600 px-1.5 py-0.5 text-xs text-white">
									{customViews.length}
								</span>
							)}
						</button>

						{showCustomViewDropdown && (
							<div
								className="pro-bg3 pro-divider absolute top-full right-0 mt-1 min-w-[200px] border shadow-lg"
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
														<Icon name="check" height={12} width={12} className="text-green-500" />
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
														className="pro-text3 p-1 transition-colors hover:text-red-500"
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
												className="pro-hover-bg pro-text1 flex w-full items-center justify-center gap-2 py-2 text-sm font-medium transition-colors"
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
											className="pro-border pro-hover-bg pro-text1 flex w-full items-center justify-center gap-2 border py-2 text-sm font-medium transition-colors"
										>
											<Icon name="plus" height={14} width={14} />
											<span>Save Current View</span>
										</button>
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			<ProTableCSVButton onClick={downloadCSV} smol />

			<Tooltip
				content="Create custom calculated columns with formulas like 'tvl / mcap' or '(fees_24h + revenue_24h) * 365'"
				render={<button onClick={() => setShowColumnPanel(!showColumnPanel)} />}
				className="pro-border pro-hover-bg pro-text1 pro-bg1 relative flex items-center gap-2 border px-3 py-1.5 text-sm transition-colors"
			>
				<Icon name="settings" height={14} width={14} />
				<span className="flex items-center gap-1">
					Customize Table
					<span className="rounded-sm bg-(--primary) px-1.5 py-0.5 text-xs text-white">+ Custom Columns</span>
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
