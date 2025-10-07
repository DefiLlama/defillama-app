import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import { Popover, PopoverDisclosure, usePopoverStore } from '@ariakit/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { matchSorter } from 'match-sorter'
import type { IChartProps } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { LocalLoader } from '~/components/Loaders'
import { useYieldsData } from '~/containers/ProDashboard/components/datasets/YieldsDataset/useYieldsData'
import { useYieldChartData } from '~/containers/Yields/queries/client'
import { formattedNum } from '~/utils'
import { getItemIconUrl } from '../../utils'
import { AriakitMultiSelect } from '../AriakitMultiSelect'
import { AriakitVirtualizedSelect } from '../AriakitVirtualizedSelect'
import { ChartTabType } from './types'

const TVLAPYChart = lazy(() => import('~/components/ECharts/TVLAPYChart')) as React.FC<IChartProps>

interface YieldsChartTabProps {
	selectedYieldPool: { configID: string; name: string; project: string; chain: string } | null
	onSelectedYieldPoolChange: (pool: { configID: string; name: string; project: string; chain: string } | null) => void
	onChartTabChange: (tab: ChartTabType) => void
	selectedYieldChains: string[]
	selectedYieldProjects: string[]
	selectedYieldCategories: string[]
	minTvl: number | null
	maxTvl: number | null
	onSelectedYieldChainsChange: (chains: string[]) => void
	onSelectedYieldProjectsChange: (projects: string[]) => void
	onSelectedYieldCategoriesChange: (categories: string[]) => void
	onMinTvlChange: (tvl: number | null) => void
	onMaxTvlChange: (tvl: number | null) => void
}

const mainChartStackColors = { APY: '#fd3c99', TVL: '#4f8fea' }
const mainChartStacks = ['APY', 'TVL']

export function YieldsChartTab({
	selectedYieldPool,
	onSelectedYieldPoolChange,
	onChartTabChange,
	selectedYieldChains,
	selectedYieldProjects,
	selectedYieldCategories,
	minTvl,
	maxTvl,
	onSelectedYieldChainsChange,
	onSelectedYieldProjectsChange,
	onSelectedYieldCategoriesChange,
	onMinTvlChange,
	onMaxTvlChange
}: YieldsChartTabProps) {
	const { data: yieldsData = [], isLoading: yieldsLoading } = useYieldsData()
	const [chainSearch, setChainSearch] = useState('')
	const [projectSearch, setProjectSearch] = useState('')
	const chainListRef = useRef<HTMLDivElement | null>(null)
	const projectListRef = useRef<HTMLDivElement | null>(null)
	const chainPopover = usePopoverStore({ placement: 'bottom-start' })
	const projectPopover = usePopoverStore({ placement: 'bottom-start' })

	const chainOptions = useMemo(() => {
		const chainTvlMap = new Map<string, number>()
		yieldsData.forEach((p: any) => {
			const chain = p.chains[0]
			if (!chain) return
			const currentTvl = chainTvlMap.get(chain) || 0
			chainTvlMap.set(chain, currentTvl + (p.tvl || 0))
		})
		return Array.from(chainTvlMap.entries())
			.sort((a, b) => b[1] - a[1])
			.map(([chain]) => ({ value: chain, label: chain }))
	}, [yieldsData])

	const projectOptions = useMemo(() => {
		const projectTvlMap = new Map<string, number>()
		yieldsData.forEach((p: any) => {
			const project = p.project
			if (!project) return
			const currentTvl = projectTvlMap.get(project) || 0
			projectTvlMap.set(project, currentTvl + (p.tvl || 0))
		})
		return Array.from(projectTvlMap.entries())
			.sort((a, b) => b[1] - a[1])
			.map(([project]) => ({ value: project, label: project }))
	}, [yieldsData])

	const categoryOptions = useMemo(
		() =>
			[...new Set(yieldsData.map((p: any) => p.category).filter(Boolean))]
				.sort()
				.map((cat: string) => ({ value: cat, label: cat })),
		[yieldsData]
	)

	const filteredChainOptions = useMemo(() => {
		if (!chainSearch) return chainOptions
		return matchSorter(chainOptions, chainSearch, { keys: ['label'] })
	}, [chainOptions, chainSearch])

	const filteredProjectOptions = useMemo(() => {
		if (!projectSearch) return projectOptions
		return matchSorter(projectOptions, projectSearch, { keys: ['label'] })
	}, [projectOptions, projectSearch])

	const chainVirtualizer = useVirtualizer({
		count: filteredChainOptions.length,
		getScrollElement: () => chainListRef.current,
		estimateSize: () => 44,
		overscan: 8
	})

	const projectVirtualizer = useVirtualizer({
		count: filteredProjectOptions.length,
		getScrollElement: () => projectListRef.current,
		estimateSize: () => 44,
		overscan: 8
	})

	const toggleChain = (value: string) => {
		if (selectedYieldChains.includes(value)) {
			onSelectedYieldChainsChange(selectedYieldChains.filter((v) => v !== value))
		} else {
			onSelectedYieldChainsChange([...selectedYieldChains, value])
		}
	}

	const toggleProject = (value: string) => {
		if (selectedYieldProjects.includes(value)) {
			onSelectedYieldProjectsChange(selectedYieldProjects.filter((v) => v !== value))
		} else {
			onSelectedYieldProjectsChange([...selectedYieldProjects, value])
		}
	}

	const filteredPools = useMemo(() => {
		return yieldsData.filter((pool: any) => {
			if (selectedYieldChains.length > 0 && !selectedYieldChains.includes(pool.chains[0])) {
				return false
			}

			if (selectedYieldProjects.length > 0 && !selectedYieldProjects.includes(pool.project)) {
				return false
			}

			if (selectedYieldCategories.length > 0 && !selectedYieldCategories.includes(pool.category)) {
				return false
			}

			if (minTvl !== null && pool.tvl < minTvl) {
				return false
			}
			if (maxTvl !== null && pool.tvl > maxTvl) {
				return false
			}

			return true
		})
	}, [yieldsData, selectedYieldChains, selectedYieldProjects, selectedYieldCategories, minTvl, maxTvl])

	const poolOptions = useMemo(() => {
		return filteredPools
			.sort((a: any, b: any) => (b.tvl || 0) - (a.tvl || 0))
			.map((pool: any) => ({
				value: pool.configID,
				label: `${pool.pool} (${pool.project})`,
				description: `${pool.chains[0]} • APY: ${pool.apy?.toFixed(2) || '0.00'}%`
			}))
	}, [filteredPools])

	const { data: selectedYieldChartData, isLoading: selectedYieldChartLoading } = useYieldChartData(
		selectedYieldPool?.configID || null
	)

	const yieldsChartData = useMemo(() => {
		if (!selectedYieldChartData || !selectedYieldChartData.data) return []
		return selectedYieldChartData.data.map((el: any) => ({
			date: Math.floor(new Date(el.timestamp.split('T')[0]).getTime() / 1000),
			TVL: el.tvlUsd,
			APY: el.apy ?? null
		}))
	}, [selectedYieldChartData])

	const latestYieldData = useMemo(() => {
		if (!selectedYieldChartData || !selectedYieldChartData.data || selectedYieldChartData.data.length === 0) {
			return { apy: null, tvl: null }
		}
		const latest = selectedYieldChartData.data[selectedYieldChartData.data.length - 1]
		return {
			apy: latest.apy?.toFixed(2) ?? null,
			tvl: latest.tvlUsd ?? null
		}
	}, [selectedYieldChartData])

	return (
		<div className="flex h-full min-h-[400px] gap-3 overflow-hidden">
			<div className="pro-border flex w-[380px] flex-col border lg:w-[420px]">
				<div className="flex h-full flex-col p-3">
					<div className="mb-3 rounded-lg border border-(--cards-border) bg-(--cards-bg-alt)/60 p-1">
						<div className="grid grid-cols-2 gap-1">
							<button
								type="button"
								onClick={() => onChartTabChange('chain')}
								className="group rounded-md px-3 py-2.5 text-xs font-semibold text-(--text-secondary) transition-all hover:bg-(--cards-bg) hover:text-(--text-primary)"
							>
								<div className="flex items-center justify-center gap-2">
									<Icon
										name="bar-chart-2"
										width={14}
										height={14}
										className="text-(--text-tertiary) transition-colors group-hover:text-(--text-secondary)"
									/>
									<span>Protocols/Chains</span>
								</div>
							</button>
							<button
								type="button"
								className="group rounded-md bg-(--primary)/10 px-3 py-2.5 text-xs font-semibold text-(--primary) shadow-sm transition-all"
							>
								<div className="flex items-center justify-center gap-2">
									<Icon name="percent" width={14} height={14} className="text-(--primary)" />
									<span>Yields</span>
								</div>
							</button>
						</div>
					</div>

					{yieldsLoading ? (
						<div className="flex flex-1 items-center justify-center">
							<LocalLoader />
						</div>
					) : (
						<>
							<div className="mb-3 flex-shrink-0 space-y-2">
								<div className="flex flex-col">
									<label className="pro-text2 mb-1 block text-[11px] font-medium">Chains</label>
									<PopoverDisclosure
										store={chainPopover}
										className="flex w-full items-center justify-between rounded-md border border-(--form-control-border) bg-(--bg-input) px-2 py-1.5 text-xs transition-colors hover:border-(--primary)/40 focus:border-(--primary) focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
									>
										<span className={selectedYieldChains.length > 0 ? 'pro-text1' : 'pro-text3'}>
											{selectedYieldChains.length > 0
												? `${selectedYieldChains.length} chain${selectedYieldChains.length > 1 ? 's' : ''} selected`
												: 'All chains'}
										</span>
										<Icon name="chevron-down" width={12} height={12} className="ml-2 flex-shrink-0 opacity-70" />
									</PopoverDisclosure>
									<Popover
										store={chainPopover}
										modal={false}
										portal={true}
										gutter={4}
										flip={false}
										className="z-50 rounded-md border border-(--cards-border) bg-(--cards-bg) shadow-xl"
										style={{ width: 'var(--popover-anchor-width)' }}
									>
										<div className="p-2.5">
											<div className="relative mb-2.5">
												<Icon
													name="search"
													width={12}
													height={12}
													className="absolute top-1/2 left-2.5 -translate-y-1/2 text-(--text-tertiary)"
												/>
												<input
													autoFocus
													value={chainSearch}
													onChange={(e) => setChainSearch(e.target.value)}
													placeholder="Search chains..."
													className="w-full rounded-md border border-(--form-control-border) bg-(--bg-input) py-1.5 pr-2.5 pl-7 text-xs transition-colors focus:border-(--primary) focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
												/>
											</div>
											<div
												className="thin-scrollbar max-h-[240px] overflow-y-auto rounded-md border border-(--cards-border) bg-(--cards-bg-alt)/30"
												ref={chainListRef}
											>
												<div
													className="p-1"
													style={{
														height: chainVirtualizer.getTotalSize(),
														position: 'relative'
													}}
												>
													{chainVirtualizer.getVirtualItems().map((row) => {
														const option = filteredChainOptions[row.index]
														if (!option) return null
														const isActive = selectedYieldChains.includes(option.value)
														const iconUrl = getItemIconUrl('chain', null, option.value)
														return (
															<button
																key={option.value}
																onClick={() => toggleChain(option.value)}
																className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs transition-all hover:bg-(--cards-bg-alt) ${
																	isActive
																		? 'bg-(--primary)/10 font-semibold text-(--primary) shadow-sm'
																		: 'text-(--text-secondary) hover:text-(--text-primary)'
																}`}
																style={{
																	position: 'absolute',
																	top: 0,
																	left: 0,
																	width: '100%',
																	transform: `translateY(${row.start}px)`
																}}
															>
																<div className="flex min-w-0 items-center gap-2.5">
																	{iconUrl && (
																		<img
																			src={iconUrl}
																			alt={option.label}
																			className="h-5 w-5 rounded-full object-cover ring-1 ring-(--cards-border)"
																			onError={(e) => {
																				e.currentTarget.style.display = 'none'
																			}}
																		/>
																	)}
																	<span className="truncate">{option.label}</span>
																</div>
																{isActive && (
																	<Icon
																		name="check"
																		width={14}
																		height={14}
																		className="ml-2 flex-shrink-0 text-(--primary)"
																	/>
																)}
															</button>
														)
													})}
												</div>
											</div>
											{selectedYieldChains.length > 0 && (
												<div className="mt-2.5 flex items-center justify-between rounded-md border border-(--cards-border) bg-(--cards-bg-alt)/40 px-2.5 py-2">
													<span className="text-[11px] font-medium text-(--text-secondary)">
														{selectedYieldChains.length} selected
													</span>
													<button
														type="button"
														onClick={() => onSelectedYieldChainsChange([])}
														className="text-[11px] font-medium text-(--text-tertiary) transition-colors hover:text-(--primary)"
													>
														Clear
													</button>
												</div>
											)}
										</div>
									</Popover>
								</div>

								<div className="flex flex-col">
									<label className="pro-text2 mb-1 block text-[11px] font-medium">Projects</label>
									<PopoverDisclosure
										store={projectPopover}
										className="flex w-full items-center justify-between rounded-md border border-(--form-control-border) bg-(--bg-input) px-2 py-1.5 text-xs transition-colors hover:border-(--primary)/40 focus:border-(--primary) focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
									>
										<span className={selectedYieldProjects.length > 0 ? 'pro-text1' : 'pro-text3'}>
											{selectedYieldProjects.length > 0
												? `${selectedYieldProjects.length} project${selectedYieldProjects.length > 1 ? 's' : ''} selected`
												: 'All projects'}
										</span>
										<Icon name="chevron-down" width={12} height={12} className="ml-2 flex-shrink-0 opacity-70" />
									</PopoverDisclosure>
									<Popover
										store={projectPopover}
										modal={false}
										portal={true}
										gutter={4}
										flip={false}
										className="z-50 rounded-md border border-(--cards-border) bg-(--cards-bg) shadow-xl"
										style={{ width: 'var(--popover-anchor-width)' }}
									>
										<div className="p-2.5">
											<div className="relative mb-2.5">
												<Icon
													name="search"
													width={12}
													height={12}
													className="absolute top-1/2 left-2.5 -translate-y-1/2 text-(--text-tertiary)"
												/>
												<input
													autoFocus
													value={projectSearch}
													onChange={(e) => setProjectSearch(e.target.value)}
													placeholder="Search projects..."
													className="w-full rounded-md border border-(--form-control-border) bg-(--bg-input) py-1.5 pr-2.5 pl-7 text-xs transition-colors focus:border-(--primary) focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
												/>
											</div>
											<div
												className="thin-scrollbar max-h-[240px] overflow-y-auto rounded-md border border-(--cards-border) bg-(--cards-bg-alt)/30"
												ref={projectListRef}
											>
												<div
													className="p-1"
													style={{
														height: projectVirtualizer.getTotalSize(),
														position: 'relative'
													}}
												>
													{projectVirtualizer.getVirtualItems().map((row) => {
														const option = filteredProjectOptions[row.index]
														if (!option) return null
														const isActive = selectedYieldProjects.includes(option.value)
														const iconUrl = getItemIconUrl('protocol', null, option.value)
														return (
															<button
																key={option.value}
																onClick={() => toggleProject(option.value)}
																className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs transition-all hover:bg-(--cards-bg-alt) ${
																	isActive
																		? 'bg-(--primary)/10 font-semibold text-(--primary) shadow-sm'
																		: 'text-(--text-secondary) hover:text-(--text-primary)'
																}`}
																style={{
																	position: 'absolute',
																	top: 0,
																	left: 0,
																	width: '100%',
																	transform: `translateY(${row.start}px)`
																}}
															>
																<div className="flex min-w-0 items-center gap-2.5">
																	{iconUrl && (
																		<img
																			src={iconUrl}
																			alt={option.label}
																			className="h-5 w-5 rounded-full object-cover ring-1 ring-(--cards-border)"
																			onError={(e) => {
																				e.currentTarget.style.display = 'none'
																			}}
																		/>
																	)}
																	<span className="truncate">{option.label}</span>
																</div>
																{isActive && (
																	<Icon
																		name="check"
																		width={14}
																		height={14}
																		className="ml-2 flex-shrink-0 text-(--primary)"
																	/>
																)}
															</button>
														)
													})}
												</div>
											</div>
											{selectedYieldProjects.length > 0 && (
												<div className="mt-2.5 flex items-center justify-between rounded-md border border-(--cards-border) bg-(--cards-bg-alt)/40 px-2.5 py-2">
													<span className="text-[11px] font-medium text-(--text-secondary)">
														{selectedYieldProjects.length} selected
													</span>
													<button
														type="button"
														onClick={() => onSelectedYieldProjectsChange([])}
														className="text-[11px] font-medium text-(--text-tertiary) transition-colors hover:text-(--primary)"
													>
														Clear
													</button>
												</div>
											)}
										</div>
									</Popover>
								</div>

								<AriakitMultiSelect
									label="Categories"
									options={categoryOptions}
									selectedValues={selectedYieldCategories}
									onChange={onSelectedYieldCategoriesChange}
									placeholder="All categories"
								/>

								<div>
									<label className="pro-text2 mb-1 block text-[11px] font-medium">TVL Range</label>
									<div className="flex gap-2">
										<input
											type="number"
											placeholder="Min"
											value={minTvl ?? ''}
											onChange={(e) => onMinTvlChange(e.target.value ? Number(e.target.value) : null)}
											className="pro-text1 placeholder:pro-text3 w-full rounded-md border border-(--form-control-border) bg-(--bg-input) px-2 py-1.5 text-xs focus:border-(--primary) focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
										/>
										<input
											type="number"
											placeholder="Max"
											value={maxTvl ?? ''}
											onChange={(e) => onMaxTvlChange(e.target.value ? Number(e.target.value) : null)}
											className="pro-text1 placeholder:pro-text3 w-full rounded-md border border-(--form-control-border) bg-(--bg-input) px-2 py-1.5 text-xs focus:border-(--primary) focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
										/>
									</div>
								</div>
							</div>

							<div className="mb-2 flex-shrink-0">
								<AriakitVirtualizedSelect
									label="Select Yield Pool"
									options={poolOptions}
									selectedValue={selectedYieldPool?.configID || null}
									onChange={(option) => {
										const pool = filteredPools.find((p: any) => p.configID === option.value)
										if (pool && onSelectedYieldPoolChange) {
											onSelectedYieldPoolChange({
												configID: pool.configID,
												name: pool.pool,
												project: pool.project,
												chain: pool.chains[0]
											})
										}
									}}
									placeholder="Search pools..."
								/>
							</div>

							<p className="pro-text3 mb-2 text-xs">
								{filteredPools.length} pool{filteredPools.length !== 1 ? 's' : ''} match your filters
							</p>
						</>
					)}
				</div>
			</div>

			<div className="pro-border flex flex-1 flex-col overflow-hidden border">
				<div className="pro-text2 flex-shrink-0 px-3 py-2 text-xs font-medium">Preview</div>

				{selectedYieldPool ? (
					<div className="min-h-0 flex-1 overflow-auto rounded-md bg-(--cards-bg) p-3">
						<div className="mb-3">
							<h3 className="pro-text1 mb-1 text-sm font-semibold">{selectedYieldPool.name}</h3>
							<p className="pro-text2 text-xs">
								{selectedYieldPool.project} - {selectedYieldPool.chain}
							</p>
						</div>

						{latestYieldData.apy !== null && latestYieldData.tvl !== null && (
							<div className="mb-3 flex gap-4">
								<div className="flex flex-col">
									<span className="pro-text3 text-[10px] uppercase">Latest APY</span>
									<span className="font-jetbrains text-base font-semibold" style={{ color: mainChartStackColors.APY }}>
										{latestYieldData.apy}%
									</span>
								</div>
								<div className="flex flex-col">
									<span className="pro-text3 text-[10px] uppercase">TVL</span>
									<span className="font-jetbrains text-base font-semibold" style={{ color: mainChartStackColors.TVL }}>
										{formattedNum(latestYieldData.tvl, true)}
									</span>
								</div>
							</div>
						)}

						<div className="min-h-[320px]">
							{selectedYieldChartLoading ? (
								<div className="flex h-[320px] items-center justify-center">
									<LocalLoader />
								</div>
							) : (
								<Suspense
									fallback={
										<div className="flex h-[320px] items-center justify-center">
											<LocalLoader />
										</div>
									}
								>
									<TVLAPYChart
										height="320px"
										chartData={yieldsChartData}
										stackColors={mainChartStackColors}
										stacks={mainChartStacks}
										title=""
										alwaysShowTooltip={false}
									/>
								</Suspense>
							)}
						</div>
					</div>
				) : (
					<div className="pro-text3 flex flex-1 items-center justify-center text-center">
						<div>
							<Icon name="bar-chart-2" height={32} width={32} className="mx-auto mb-1" />
							<div className="text-xs">Select a yield pool to see preview</div>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
