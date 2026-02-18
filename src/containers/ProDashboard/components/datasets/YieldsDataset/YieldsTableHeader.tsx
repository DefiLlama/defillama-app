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

const EMPTY_CHAINS: string[] = []

export function YieldsTableHeader({
	chains = EMPTY_CHAINS,
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

	const presetKeys = React.useMemo(() => {
		const keys: string[] = []
		for (const presetKey in columnPresets) {
			keys.push(presetKey)
		}
		return keys
	}, [columnPresets])

	return (
		<div className="mb-3">
			<div className="mb-3 flex items-center justify-between gap-4">
				<h3 className="text-lg font-semibold pro-text1">{displayTitle}</h3>
				<div className="flex items-center gap-2">
					<input
						type="text"
						placeholder="Search pools..."
						value={poolName}
						onChange={(e) => setPoolName(e.target.value)}
						className="w-full rounded-md border pro-border bg-(--bg-glass) px-3 py-1.5 text-sm pro-text1 focus:border-(--primary) focus:outline-hidden"
					/>
				</div>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					{presetKeys.map((preset) => (
						<button
							key={preset}
							onClick={() => applyPreset(preset)}
							className={`flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm capitalize transition-colors ${
								activePreset === preset
									? 'border-(--primary) bg-(--primary) text-white'
									: 'pro-border pro-bg1 pro-hover-bg pro-text1'
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
						className="relative flex items-center gap-2 rounded-md border pro-border pro-bg1 pro-hover-bg px-3 py-1.5 text-sm pro-text1 transition-colors"
					>
						<Icon name="align-left" height={14} width={14} />
						Filters
						{activeFilterCount > 0 && (
							<span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-(--primary) text-xs text-white">
								{activeFilterCount}
							</span>
						)}
						<Icon name={showFiltersPanel ? 'chevron-up' : 'chevron-down'} height={12} width={12} />
					</button>
					<button
						onClick={() => setShowColumnPanel(!showColumnPanel)}
						className="flex items-center gap-2 rounded-md border pro-border pro-bg1 pro-hover-bg px-3 py-1.5 text-sm pro-text1 transition-colors"
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
