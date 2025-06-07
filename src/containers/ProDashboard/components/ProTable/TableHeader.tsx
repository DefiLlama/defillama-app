import * as React from 'react'
import { Icon } from '~/components/Icon'
import { ProTableCSVButton } from './CsvButton'

interface TableHeaderProps {
	chain: string
	columnPresets: Record<string, string[]>
	applyPreset: (presetName: string) => void
	showColumnPanel: boolean
	setShowColumnPanel: (show: boolean) => void
	downloadCSV: () => void
}

export function TableHeader({
	chain,
	columnPresets,
	applyPreset,
	showColumnPanel,
	setShowColumnPanel,
	downloadCSV
}: TableHeaderProps) {
	return (
		<div className="flex items-center justify-between flex-wrap gap-2 mb-2 pr-6">
			<h3 className="text-base font-semibold mr-auto">{chain} Protocols</h3>

			<div className="flex items-center gap-2">
				{Object.keys(columnPresets).map((preset) => (
					<button
						key={preset}
						onClick={() => applyPreset(preset)}
						className="flex items-center gap-1 px-3 py-2 text-sm border border-[var(--divider)] hover:bg-[var(--bg3)] text-[var(--text1)] capitalize transition-colors bg-[var(--bg1)] dark:bg-[#070e0f]"
					>
						{preset}
					</button>
				))}
			</div>

			<ProTableCSVButton onClick={downloadCSV} smol />

			{/* Enhanced Column Manager Button */}
			<button
				onClick={() => setShowColumnPanel(!showColumnPanel)}
				className="flex items-center gap-2 px-3 py-2 text-sm border border-[var(--divider)] hover:bg-[var(--bg3)] text-[var(--text1)] transition-colors bg-[var(--bg1)] dark:bg-[#070e0f]"
			>
				<Icon name="settings" height={14} width={14} />
				Customize Table
				<Icon name={showColumnPanel ? 'chevron-up' : 'chevron-down'} height={12} width={12} />
			</button>
		</div>
	)
}