import * as React from 'react'
import { Icon } from '~/components/Icon'
import { ProTableCSVButton } from './CsvButton'
import { Tooltip } from '~/components/Tooltip'

interface TableHeaderProps {
	chains: string[]
	columnPresets: Record<string, string[]>
	applyPreset: (presetName: string) => void
	activePreset: string | null
	showColumnPanel: boolean
	setShowColumnPanel: (show: boolean) => void
	downloadCSV: () => void
	colSpan?: 1 | 2
}

export function TableHeader({
	chains,
	columnPresets,
	applyPreset,
	activePreset,
	showColumnPanel,
	setShowColumnPanel,
	downloadCSV,
	colSpan = 2
}: TableHeaderProps) {
	const displayTitle = React.useMemo(() => {
		if (chains.length === 0) return 'All Protocols'
		if (chains.length === 1) return `${chains[0]} Protocols`
		if (chains.length <= 3) return `${chains.join(', ')} Protocols`
		return `${chains.length} Chains Protocols`
	}, [chains])
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
								activePreset === preset
									? 'border-(--primary) bg-(--primary) text-white'
									: 'pro-border pro-hover-bg pro-text1 pro-bg1'
							}`}
						>
							{preset}
						</button>
					))}
				</div>
			)}

			<ProTableCSVButton onClick={downloadCSV} smol />

			<Tooltip content="Create custom calculated columns with formulas like 'tvl / mcap' or '(fees_24h + revenue_24h) * 365'">
				<button
					onClick={() => setShowColumnPanel(!showColumnPanel)}
					className="pro-border pro-hover-bg pro-text1 pro-bg1 relative flex items-center gap-2 border px-3 py-1.5 text-sm transition-colors"
				>
					<Icon name="settings" height={14} width={14} />
					<span className="flex items-center gap-1">
						Customize Table
						<span className="rounded-sm bg-(--primary) px-1.5 py-0.5 text-xs text-white">+ Custom Columns</span>
					</span>
					<Icon name={showColumnPanel ? 'chevron-up' : 'chevron-down'} height={12} width={12} />
				</button>
			</Tooltip>
		</div>
	)
}
