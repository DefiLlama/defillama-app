import * as React from 'react'
import { Icon } from '~/components/Icon'
import { ProTableCSVButton } from '../../ProTable/CsvButton'

interface YieldsTableHeaderProps {
	chains?: string[]
	columnPresets: Record<string, string[]>
	applyPreset: (presetName: string) => void
	activePreset: string | null
	showColumnPanel: boolean
	setShowColumnPanel: (show: boolean) => void
	downloadCSV: () => void
	poolName: string
	setPoolName: (name: string) => void
	showFiltersPanel: boolean
	setShowFiltersPanel: (show: boolean) => void
	activeFilterCount: number
}

export function YieldsTableHeader({
	chains = [],
	columnPresets,
	applyPreset,
	activePreset,
	showColumnPanel,
	setShowColumnPanel,
	downloadCSV,
	poolName,
	setPoolName,
	showFiltersPanel,
	setShowFiltersPanel,
	activeFilterCount
}: YieldsTableHeaderProps) {
	const displayTitle = React.useMemo(() => {
		if (chains.length === 0 || (chains.length === 1 && chains[0] === 'All')) {
			return 'Yield Opportunities'
		}
		if (chains.length === 1) {
			return `${chains[0]} Yields`
		}
		if (chains.length <= 3) {
			return `${chains.join(', ')} Yields`
		}
		return `${chains.length} Chains Yields`
	}, [chains])

	return (
		<div className="mb-3">
			<div className="flex items-center justify-between gap-4 mb-3">
				<h3 className="text-lg font-semibold pro-text1">{displayTitle}</h3>
				<div className="flex items-center gap-2">
					<input
						type="text"
						placeholder="Search pools..."
						value={poolName}
						onChange={(e) => setPoolName(e.target.value)}
						className="px-3 py-1.5 text-sm border pro-border pro-bg1 pro-text1
							focus:outline-hidden focus:ring-1 focus:ring-(--primary)"
					/>
				</div>
			</div>

			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-2">
					{Object.keys(columnPresets).map((preset) => (
						<button
							key={preset}
							onClick={() => applyPreset(preset)}
							className={`flex items-center gap-1 px-3 py-1.5 text-sm border capitalize transition-colors ${
								activePreset === preset
									? 'bg-(--primary) text-white border-(--primary)'
									: 'pro-border pro-hover-bg pro-text1 pro-bg1'
							}`}
						>
							{preset}
						</button>
					))}
				</div>

				<div className="flex items-center gap-2">
					<ProTableCSVButton onClick={downloadCSV} smol />

					<button
						onClick={() => setShowFiltersPanel(!showFiltersPanel)}
						className="flex items-center gap-2 px-3 py-1.5 text-sm border pro-border pro-hover-bg pro-text1 transition-colors pro-bg1 relative"
					>
						<Icon name="align-left" height={14} width={14} />
						Filters
						{activeFilterCount > 0 && (
							<span className="absolute -top-1 -right-1 bg-(--primary) text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
								{activeFilterCount}
							</span>
						)}
						<Icon name={showFiltersPanel ? 'chevron-up' : 'chevron-down'} height={12} width={12} />
					</button>
					<button
						onClick={() => setShowColumnPanel(!showColumnPanel)}
						className="flex items-center gap-2 px-3 py-1.5 text-sm border pro-border pro-hover-bg pro-text1 transition-colors pro-bg1"
					>
						<Icon name="settings" height={14} width={14} />
						Customize Table
						<Icon name={showColumnPanel ? 'chevron-up' : 'chevron-down'} height={12} width={12} />
					</button>
				</div>
			</div>
		</div>
	)
}
