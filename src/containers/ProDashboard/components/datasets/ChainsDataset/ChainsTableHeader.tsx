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
	isCSVLoading?: boolean
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
	isCSVLoading,
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
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h3 className="pro-text1 text-lg font-semibold">{category ? `${category} Chains` : 'All Chains'}</h3>

				<div className="flex flex-wrap items-center gap-2">
					<div className="flex items-center gap-2">
						{presetButtons.map((preset) => (
							<button
								key={preset.key}
								onClick={() => {
									applyPreset(preset.key)
									setSelectedPreset(preset.key)
								}}
								className={`flex items-center gap-1 border px-3 py-1.5 text-sm capitalize transition-colors ${
									selectedPreset === preset.key
										? 'border-(--primary) bg-(--primary) text-white'
										: 'pro-border pro-hover-bg pro-text1 pro-bg1'
								}`}
							>
								{preset.label}
							</button>
						))}
					</div>

					<div className="flex items-center gap-2">
						<ProTableCSVButton onClick={handleExportCSV} isLoading={isCSVLoading} smol />

						<button
							onClick={() => setShowColumnSelector(!showColumnSelector)}
							className="pro-border pro-hover-bg pro-text1 pro-bg1 flex items-center gap-2 border px-3 py-1.5 text-sm transition-colors"
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
