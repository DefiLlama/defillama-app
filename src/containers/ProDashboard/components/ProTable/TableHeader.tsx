import * as React from 'react'
import { Icon } from '~/components/Icon'
import { ProTableCSVButton } from './CsvButton'

interface TableHeaderProps {
	chains: string[]
	columnPresets: Record<string, string[]>
	applyPreset: (presetName: string) => void
	showColumnPanel: boolean
	setShowColumnPanel: (show: boolean) => void
	downloadCSV: () => void
	colSpan?: 1 | 2
}

export function TableHeader({
	chains,
	columnPresets,
	applyPreset,
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
							className="flex items-center gap-1 px-3 py-1.5 text-sm border pro-border pro-hover-bg pro-text1 capitalize transition-colors pro-bg1"
						>
							{preset}
						</button>
					))}
				</div>
			)}

			<ProTableCSVButton onClick={downloadCSV} smol />

			<button
				onClick={() => setShowColumnPanel(!showColumnPanel)}
				className="flex items-center gap-2 px-3 py-1.5 text-sm border pro-border pro-hover-bg pro-text1 transition-colors pro-bg1"
			>
				<Icon name="settings" height={14} width={14} />
				Customize Table
				<Icon name={showColumnPanel ? 'chevron-up' : 'chevron-down'} height={12} width={12} />
			</button>
		</div>
	)
}
