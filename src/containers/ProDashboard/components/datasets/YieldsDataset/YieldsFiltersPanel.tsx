import * as React from 'react'
import { AriakitVirtualizedMultiSelect } from '../../AriakitVirtualizedMultiSelect'

export interface YieldsFilters {
	apyMin?: number
	apyMax?: number
	tvlMin?: number
	tvlMax?: number
	baseApyMin?: number
	baseApyMax?: number
	chains?: string[]
	protocols?: string[]
	tokens?: string[]
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
	availableProtocols: Array<{ value: string; label: string; logo?: string }>
	availableTokens: string[]
	onApplyFilters: (filters?: YieldsFilters) => void
	onResetFilters: () => void
	activeFilterCount: number
}

export function YieldsFiltersPanel({
	showFiltersPanel,
	setShowFiltersPanel,
	filters,
	setFilters,
	availableChains,
	availableProtocols,
	availableTokens,
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

	const formatNumberWithCommas = (num: number | undefined): string => {
		if (num === undefined || num === null) return ''
		return num.toLocaleString('en-US', { maximumFractionDigits: 0 })
	}

	const parseFormattedNumber = (value: string): number | undefined => {
		const cleaned = value.replace(/,/g, '')
		const parsed = Number(cleaned)
		return cleaned && !isNaN(parsed) ? parsed : undefined
	}

	const handleApply = () => {
		setFilters(localFilters)
		onApplyFilters(localFilters)
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
		<div className="relative mb-4 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4" style={{ zIndex: 50, pointerEvents: 'auto' }}>
			<div className="mb-3 flex items-center justify-between">
				<h4 className="pro-text1 text-sm font-medium">Filter Yields</h4>
				<div className="flex items-center gap-2">
					{activeFilterCount > 0 && (
						<button
							onClick={handleReset}
								className="pro-divider pro-hover-bg pro-text2 pro-bg2 rounded-md border px-2 py-1 text-xs transition-colors"
						>
							Clear All ({activeFilterCount})
						</button>
					)}
				</div>
			</div>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
				<div>
					<h5 className="pro-text2 mb-3 text-xs font-medium tracking-wide uppercase">Yield Filters</h5>

					<div className="space-y-3">
						<div>
							<label className="pro-text2 mb-2 block text-xs font-medium">Total APY Range</label>
							<div className="flex items-center gap-2">
								<input
									type="number"
									placeholder="Min %"
									value={localFilters.apyMin || ''}
									onChange={(e) => updateFilter('apyMin', e.target.value ? Number(e.target.value) : undefined)}
									className="pro-border pro-text1 placeholder:pro-text3 flex-1 rounded-md border bg-(--bg-glass) px-2 py-1.5 text-sm transition-colors focus:border-(--primary) focus:outline-hidden"
								/>
								<span className="pro-text3">-</span>
								<input
									type="number"
									placeholder="Max %"
									value={localFilters.apyMax || ''}
									onChange={(e) => updateFilter('apyMax', e.target.value ? Number(e.target.value) : undefined)}
									className="pro-border pro-text1 placeholder:pro-text3 flex-1 rounded-md border bg-(--bg-glass) px-2 py-1.5 text-sm transition-colors focus:border-(--primary) focus:outline-hidden"
								/>
							</div>
						</div>

						<div>
							<label className="pro-text2 mb-2 block text-xs font-medium">Base APY Range</label>
							<div className="flex items-center gap-2">
								<input
									type="number"
									placeholder="Min %"
									value={localFilters.baseApyMin || ''}
									onChange={(e) => updateFilter('baseApyMin', e.target.value ? Number(e.target.value) : undefined)}
									className="pro-border pro-text1 placeholder:pro-text3 flex-1 rounded-md border bg-(--bg-glass) px-2 py-1.5 text-sm transition-colors focus:border-(--primary) focus:outline-hidden"
								/>
								<span className="pro-text3">-</span>
								<input
									type="number"
									placeholder="Max %"
									value={localFilters.baseApyMax || ''}
									onChange={(e) => updateFilter('baseApyMax', e.target.value ? Number(e.target.value) : undefined)}
									className="pro-border pro-text1 placeholder:pro-text3 flex-1 rounded-md border bg-(--bg-glass) px-2 py-1.5 text-sm transition-colors focus:border-(--primary) focus:outline-hidden"
								/>
							</div>
						</div>

						<label className="group flex cursor-pointer items-center gap-2">
							<div className="relative h-4 w-4">
								<input
									type="checkbox"
									checked={localFilters.hasRewards || false}
									onChange={(e) => updateFilter('hasRewards', e.target.checked)}
									className="sr-only"
								/>
								<div
									className={`h-4 w-4 rounded-sm border-2 transition-all duration-150 ${
										localFilters.hasRewards
											? 'border-(--primary) bg-(--primary)'
											: 'border-(--text-tertiary) bg-transparent group-hover:border-(--text-secondary)'
									}`}
								>
									{localFilters.hasRewards && (
										<svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
											<path
												fillRule="evenodd"
												d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
												clipRule="evenodd"
											/>
										</svg>
									)}
								</div>
							</div>
							<span className="pro-text1 text-sm">Has Reward Incentives</span>
						</label>
					</div>
				</div>

				<div>
					<h5 className="pro-text2 mb-3 text-xs font-medium tracking-wide uppercase">Pool Filters</h5>

					<div className="space-y-3">
						<div>
							<label className="pro-text2 mb-2 block text-xs font-medium">TVL Range (USD)</label>
							<div className="flex items-center gap-2">
								<input
									type="text"
									placeholder="Min"
									value={formatNumberWithCommas(localFilters.tvlMin)}
									onChange={(e) => updateFilter('tvlMin', parseFormattedNumber(e.target.value))}
									className="pro-border pro-text1 placeholder:pro-text3 flex-1 rounded-md border bg-(--bg-glass) px-2 py-1.5 text-sm transition-colors focus:border-(--primary) focus:outline-hidden"
								/>
								<span className="pro-text3">-</span>
								<input
									type="text"
									placeholder="Max"
									value={formatNumberWithCommas(localFilters.tvlMax)}
									onChange={(e) => updateFilter('tvlMax', parseFormattedNumber(e.target.value))}
									className="pro-border pro-text1 placeholder:pro-text3 flex-1 rounded-md border bg-(--bg-glass) px-2 py-1.5 text-sm transition-colors focus:border-(--primary) focus:outline-hidden"
								/>
							</div>
						</div>
					</div>
				</div>

				<div>
					<h5 className="pro-text2 mb-3 text-xs font-medium tracking-wide uppercase">Pool Types</h5>

					<div className="space-y-2">
						<label className="group flex cursor-pointer items-center gap-2">
							<div className="relative h-4 w-4">
								<input
									type="checkbox"
									checked={localFilters.stablesOnly || false}
									onChange={(e) => updateFilter('stablesOnly', e.target.checked)}
									className="sr-only"
								/>
								<div
									className={`h-4 w-4 border-2 transition-all duration-150 ${
										localFilters.stablesOnly
											? 'border-(--primary) bg-(--primary)'
											: 'border-(--text-tertiary) bg-transparent group-hover:border-(--text-secondary)'
									}`}
								>
									{localFilters.stablesOnly && (
										<svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
											<path
												fillRule="evenodd"
												d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
												clipRule="evenodd"
											/>
										</svg>
									)}
								</div>
							</div>
							<span className="pro-text1 text-sm">Stablecoins Only</span>
						</label>

						<div className="mt-4">
							<label className="pro-text2 mb-3 block text-xs font-medium">Pool Categories</label>
							<div className="space-y-2">
								{['DEX', 'Lending', 'Staking', 'CDP', 'Bridge', 'Yield Aggregator'].map((type) => (
									<label key={type} className="group flex cursor-pointer items-center gap-2">
										<div className="relative h-4 w-4">
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
												className={`h-4 w-4 rounded-sm border-2 transition-all duration-150 ${
													localFilters.poolTypes?.includes(type)
														? 'border-(--primary) bg-(--primary)'
														: 'border-(--text-tertiary) bg-transparent group-hover:border-(--text-secondary)'
												}`}
											>
												{localFilters.poolTypes?.includes(type) && (
													<svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
														<path
															fillRule="evenodd"
															d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
															clipRule="evenodd"
														/>
													</svg>
												)}
											</div>
										</div>
										<span className="pro-text1 text-sm">{type}</span>
									</label>
								))}
							</div>
						</div>
					</div>
				</div>

		<div>
			<h5 className="pro-text2 mb-3 text-xs font-medium tracking-wide uppercase">Protocol & Token Filters</h5>

			<div className="space-y-3">
				<AriakitVirtualizedMultiSelect
					label="Protocols"
					options={availableProtocols}
					selectedValues={localFilters.protocols || []}
					onChange={(values) => updateFilter('protocols', values.length > 0 ? values : undefined)}
					placeholder="Select protocols..."
					renderIcon={(option) => option.logo || null}
				/>

				<AriakitVirtualizedMultiSelect
					label="Pool Tokens"
					options={availableTokens.map((token) => ({ value: token, label: token }))}
					selectedValues={localFilters.tokens || []}
					onChange={(values) => updateFilter('tokens', values.length > 0 ? values : undefined)}
					placeholder="Select tokens..."
				/>
			</div>
		</div>
			</div>

			<div className="pro-divider mt-4 flex items-center justify-between border-t pt-3">
				<button onClick={() => setShowFiltersPanel(false)} className="pro-text2 px-3 py-1 text-xs">
					Cancel
				</button>
				<button
					onClick={handleApply}
					className="rounded-md border border-(--primary) bg-(--primary) px-3 py-1 text-xs text-white transition-colors hover:bg-(--primary-hover)"
				>
					Apply Filters
				</button>
			</div>
		</div>
	)
}
