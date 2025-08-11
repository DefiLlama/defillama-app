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
		<div className="flex items-center justify-between flex-wrap gap-2 mb-2">
			<h3 className="text-base font-semibold mr-auto">{displayTitle}</h3>

			{colSpan === 2 && (
				<div className="flex items-center gap-2">
					{Object.keys(columnPresets).map((preset) => (
						<button
							key={preset}
							onClick={() => applyPreset(preset)}
							className={`flex items-center gap-1 px-3 py-1.5 text-sm border capitalize transition-colors ${
								activePreset === preset
									? 'bg-(--primary1) text-white border-(--primary1)'
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
					className="flex items-center gap-2 px-3 py-1.5 text-sm border pro-border pro-hover-bg pro-text1 transition-colors pro-bg1 relative"
				>
					<Icon name="settings" height={14} width={14} />
					<span className="flex items-center gap-1">
						Customize Table
						<span className="text-xs px-1.5 py-0.5 bg-(--primary1) text-white rounded-sm">+ Custom Columns</span>
					</span>
					<Icon name={showColumnPanel ? 'chevron-up' : 'chevron-down'} height={12} width={12} />
				</button>
			</Tooltip>
		</div>
	)
}
