import * as React from 'react'
import { Icon } from '~/components/Icon'
import { MultiItemSelect } from '../../MultiItemSelect'

export interface YieldsFilters {
	apyMin?: number
	apyMax?: number
	tvlMin?: number
	tvlMax?: number
	baseApyMin?: number
	baseApyMax?: number
	chains?: string[]
	hasRewards?: boolean
	stablesOnly?: boolean
	activeLending?: boolean
	poolTypes?: string[]
}

interface YieldsFiltersPanelProps {
	showFiltersPanel: boolean
	setShowFiltersPanel: (show: boolean) => void
	filters: YieldsFilters
	setFilters: (filters: YieldsFilters) => void
	availableChains: string[]
	onApplyFilters: () => void
	onResetFilters: () => void
	activeFilterCount: number
}

export function YieldsFiltersPanel({
	showFiltersPanel,
	setShowFiltersPanel,
	filters,
	setFilters,
	availableChains,
	onApplyFilters,
	onResetFilters,
	activeFilterCount
}: YieldsFiltersPanelProps) {
	const [localFilters, setLocalFilters] = React.useState<YieldsFilters>(filters)

	React.useEffect(() => {
		setLocalFilters(filters)
	}, [filters])

	const updateFilter = (key: keyof YieldsFilters, value: any) => {
		setLocalFilters((prev) => ({
			...prev,
			[key]: value
		}))
	}

	const handleApply = () => {
		setFilters(localFilters)
		onApplyFilters()
		setShowFiltersPanel(false)
	}

	const handleReset = () => {
		const emptyFilters: YieldsFilters = {}
		setLocalFilters(emptyFilters)
		setFilters(emptyFilters)
		onResetFilters()
	}

	if (!showFiltersPanel) return null

	return (
		<div className="mb-4 p-4 border pro-divider pro-bg3 relative" style={{ zIndex: 50, pointerEvents: 'auto' }}>
			<div className="flex items-center justify-between mb-3">
				<h4 className="text-sm font-medium pro-text1">Filter Yields</h4>
				<div className="flex items-center gap-2">
					{activeFilterCount > 0 && (
						<button
							onClick={handleReset}
							className="px-2 py-1 text-xs border pro-divider pro-hover-bg pro-text2 transition-colors pro-bg2"
						>
							Clear All ({activeFilterCount})
						</button>
					)}
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div>
					<h5 className="text-xs font-medium pro-text2 mb-3 uppercase tracking-wide">Yield Filters</h5>

					<div className="space-y-3">
						<div>
							<label className="text-xs pro-text2 mb-2 block font-medium">Total APY Range</label>
							<div className="flex items-center gap-2">
								<input
									type="number"
									placeholder="Min %"
									value={localFilters.apyMin || ''}
									onChange={(e) => updateFilter('apyMin', e.target.value ? Number(e.target.value) : undefined)}
									className="flex-1 px-2 py-1.5 text-sm border pro-divider pro-text1 placeholder:pro-text3 focus:outline-hidden focus:border-(--primary1) transition-colors pro-bg2"
								/>
								<span className="pro-text3">-</span>
								<input
									type="number"
									placeholder="Max %"
									value={localFilters.apyMax || ''}
									onChange={(e) => updateFilter('apyMax', e.target.value ? Number(e.target.value) : undefined)}
									className="flex-1 px-2 py-1.5 text-sm border pro-divider pro-text1 placeholder:pro-text3 focus:outline-hidden focus:border-(--primary1) transition-colors pro-bg2"
								/>
							</div>
						</div>

						<div>
							<label className="text-xs pro-text2 mb-2 block font-medium">Base APY Range</label>
							<div className="flex items-center gap-2">
								<input
									type="number"
									placeholder="Min %"
									value={localFilters.baseApyMin || ''}
									onChange={(e) => updateFilter('baseApyMin', e.target.value ? Number(e.target.value) : undefined)}
									className="flex-1 px-2 py-1.5 text-sm border pro-divider pro-text1 placeholder:pro-text3 focus:outline-hidden focus:border-(--primary1) transition-colors pro-bg2"
								/>
								<span className="pro-text3">-</span>
								<input
									type="number"
									placeholder="Max %"
									value={localFilters.baseApyMax || ''}
									onChange={(e) => updateFilter('baseApyMax', e.target.value ? Number(e.target.value) : undefined)}
									className="flex-1 px-2 py-1.5 text-sm border pro-divider pro-text1 placeholder:pro-text3 focus:outline-hidden focus:border-(--primary1) transition-colors pro-bg2"
								/>
							</div>
						</div>

						<label className="flex items-center gap-2 cursor-pointer group">
							<div className="relative w-4 h-4">
								<input
									type="checkbox"
									checked={localFilters.hasRewards || false}
									onChange={(e) => updateFilter('hasRewards', e.target.checked)}
									className="sr-only"
								/>
								<div
									className={`w-4 h-4 border-2 transition-all duration-150 ${
										localFilters.hasRewards
											? 'bg-(--primary1) border-(--primary1)'
											: 'bg-transparent border-(--text3) group-hover:border-(--text2)'
									}`}
								>
									{localFilters.hasRewards && (
										<svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
											<path
												fillRule="evenodd"
												d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
												clipRule="evenodd"
											/>
										</svg>
									)}
								</div>
							</div>
							<span className="text-sm pro-text1">Has Reward Incentives</span>
						</label>
					</div>
				</div>

				<div>
					<h5 className="text-xs font-medium pro-text2 mb-3 uppercase tracking-wide">Pool Filters</h5>

					<div className="space-y-3">
						<div>
							<label className="text-xs pro-text2 mb-2 block font-medium">TVL Range (USD)</label>
							<div className="flex items-center gap-2">
								<input
									type="number"
									placeholder="Min"
									value={localFilters.tvlMin || ''}
									onChange={(e) => updateFilter('tvlMin', e.target.value ? Number(e.target.value) : undefined)}
									className="flex-1 px-2 py-1.5 text-sm border pro-divider pro-text1 placeholder:pro-text3 focus:outline-hidden focus:border-(--primary1) transition-colors pro-bg2"
								/>
								<span className="pro-text3">-</span>
								<input
									type="number"
									placeholder="Max"
									value={localFilters.tvlMax || ''}
									onChange={(e) => updateFilter('tvlMax', e.target.value ? Number(e.target.value) : undefined)}
									className="flex-1 px-2 py-1.5 text-sm border pro-divider pro-text1 placeholder:pro-text3 focus:outline-hidden focus:border-(--primary1) transition-colors pro-bg2"
								/>
							</div>
						</div>
					</div>
				</div>

				<div>
					<h5 className="text-xs font-medium pro-text2 mb-3 uppercase tracking-wide">Pool Types</h5>

					<div className="space-y-2">
						<label className="flex items-center gap-2 cursor-pointer group">
							<div className="relative w-4 h-4">
								<input
									type="checkbox"
									checked={localFilters.stablesOnly || false}
									onChange={(e) => updateFilter('stablesOnly', e.target.checked)}
									className="sr-only"
								/>
								<div
									className={`w-4 h-4 border-2 transition-all duration-150 ${
										localFilters.stablesOnly
											? 'bg-(--primary1) border-(--primary1)'
											: 'bg-transparent border-(--text3) group-hover:border-(--text2)'
									}`}
								>
									{localFilters.stablesOnly && (
										<svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
											<path
												fillRule="evenodd"
												d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
												clipRule="evenodd"
											/>
										</svg>
									)}
								</div>
							</div>
							<span className="text-sm pro-text1">Stablecoins Only</span>
						</label>

						<div className="mt-4">
							<label className="text-xs pro-text2 mb-3 block font-medium">Pool Categories</label>
							<div className="space-y-2">
								{['DEX', 'Lending', 'Staking', 'CDP', 'Bridge', 'Yield Aggregator'].map((type) => (
									<label key={type} className="flex items-center gap-2 cursor-pointer group">
										<div className="relative w-4 h-4">
											<input
												type="checkbox"
												checked={localFilters.poolTypes?.includes(type) || false}
												onChange={(e) => {
													const currentTypes = localFilters.poolTypes || []
													if (e.target.checked) {
														updateFilter('poolTypes', [...currentTypes, type])
													} else {
														const filtered = currentTypes.filter((t) => t !== type)
														updateFilter('poolTypes', filtered.length > 0 ? filtered : undefined)
													}
												}}
												className="sr-only"
											/>
											<div
												className={`w-4 h-4 border-2 transition-all duration-150 ${
													localFilters.poolTypes?.includes(type)
														? 'bg-(--primary1) border-(--primary1)'
														: 'bg-transparent border-(--text3) group-hover:border-(--text2)'
												}`}
											>
												{localFilters.poolTypes?.includes(type) && (
													<svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
														<path
															fillRule="evenodd"
															d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
															clipRule="evenodd"
														/>
													</svg>
												)}
											</div>
										</div>
										<span className="text-sm pro-text1">{type}</span>
									</label>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="mt-4 pt-3 border-t pro-divider flex items-center justify-between">
				<button onClick={() => setShowFiltersPanel(false)} className="px-3 py-1 text-xs pro-text2">
					Cancel
				</button>
				<button
					onClick={handleApply}
					className="px-3 py-1 text-xs bg-(--primary1) text-white hover:bg-(--primary1-hover) transition-colors border border-(--primary1)"
				>
					Apply Filters
				</button>
			</div>
		</div>
	)
}
