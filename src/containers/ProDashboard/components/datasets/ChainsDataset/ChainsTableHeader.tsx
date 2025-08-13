import * as React from 'react'
import { Icon } from '~/components/Icon'
import { ProTableCSVButton } from '../../ProTable/CsvButton'

interface ChainsTableHeaderProps {
	selectedPreset: string | null
	setSelectedPreset: (preset: string | null) => void
	columnPresets: Record<string, string[]>
	applyPreset: (preset: string) => void
	showColumnSelector: boolean
	setShowColumnSelector: (show: boolean) => void
	handleExportCSV: () => void
	category?: string
}

export function ChainsTableHeader({
	selectedPreset,
	setSelectedPreset,
	columnPresets,
	applyPreset,
	showColumnSelector,
	setShowColumnSelector,
	handleExportCSV,
	category
}: ChainsTableHeaderProps) {
	const presetButtons = [
		{ key: 'essential', label: 'Essential' },
		{ key: 'defi', label: 'DeFi' },
		{ key: 'volume', label: 'Volume' },
		{ key: 'advanced', label: 'Advanced' },
		{ key: 'shares', label: 'Market Share' }
	]

	return (
		<div className="mb-4">
			<div className="flex items-center justify-between gap-4 flex-wrap">
				<h3 className="text-lg font-semibold pro-text1">{category ? `${category} Chains` : 'All Chains'}</h3>

				<div className="flex items-center gap-2 flex-wrap">
					<div className="flex items-center gap-2">
						{presetButtons.map((preset) => (
							<button
								key={preset.key}
								onClick={() => {
									applyPreset(preset.key)
									setSelectedPreset(preset.key)
								}}
								className={`flex items-center gap-1 px-3 py-1.5 text-sm border capitalize transition-colors ${
									selectedPreset === preset.key
										? 'bg-(--primary) text-white border-(--primary)'
										: 'pro-border pro-hover-bg pro-text1 pro-bg1'
								}`}
							>
								{preset.label}
							</button>
						))}
					</div>

					<div className="flex items-center gap-2">
						<ProTableCSVButton onClick={handleExportCSV} smol />

						<button
							onClick={() => setShowColumnSelector(!showColumnSelector)}
							className="flex items-center gap-2 px-3 py-1.5 text-sm border pro-border pro-hover-bg pro-text1 transition-colors pro-bg1"
						>
							<Icon name="settings" height={14} width={14} />
							Customize Table
							<Icon name={showColumnSelector ? 'chevron-up' : 'chevron-down'} height={12} width={12} />
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}
