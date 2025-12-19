import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Popover, PopoverDisclosure, usePopoverStore } from '@ariakit/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { matchSorter } from 'match-sorter'
import type { IBarChartProps, IChartProps } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { LocalLoader } from '~/components/Loaders'
import { CHART_COLORS } from '~/constants/colors'
import { useYieldsData } from '~/containers/ProDashboard/components/datasets/YieldsDataset/useYieldsData'
import { useYieldChartData, useYieldChartLendBorrow } from '~/containers/Yields/queries/client'
import { formattedNum } from '~/utils'
import { getItemIconUrl } from '../../utils'
import { AriakitMultiSelect } from '../AriakitMultiSelect'
import { useYieldChartTransformations } from '../useYieldChartTransformations'

const TVLAPYChart = lazy(() => import('~/components/ECharts/TVLAPYChart')) as React.FC<IChartProps>
const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>
const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

interface YieldsChartTabProps {
	selectedYieldPool: { configID: string; name: string; project: string; chain: string } | null
	onSelectedYieldPoolChange: (pool: { configID: string; name: string; project: string; chain: string } | null) => void
	selectedYieldChartType: string
	onSelectedYieldChartTypeChange: (chartType: string) => void
	selectedYieldChains: string[]
	selectedYieldProjects: string[]
	selectedYieldCategories: string[]
	selectedYieldTokens: string[]
	minTvl: number | null
	maxTvl: number | null
	onSelectedYieldChainsChange: (chains: string[]) => void
	onSelectedYieldProjectsChange: (projects: string[]) => void
	onSelectedYieldCategoriesChange: (categories: string[]) => void
	onSelectedYieldTokensChange: (tokens: string[]) => void
	onMinTvlChange: (tvl: number | null) => void
	onMaxTvlChange: (tvl: number | null) => void
}

const mainChartStackColors = { APY: '#fd3c99', TVL: '#4f8fea' }
const mainChartStacks = ['APY', 'TVL']

const barChartStacks = { Base: 'a', Reward: 'a' }
const barChartColors = { Base: CHART_COLORS[0], Reward: CHART_COLORS[1] }
const liquidityChartColors = { Supplied: CHART_COLORS[0], Borrowed: CHART_COLORS[1], Available: CHART_COLORS[2] }
const liquidityLegendOptions = ['Supplied', 'Borrowed', 'Available']

export function YieldsChartTab({
	selectedYieldPool,
	onSelectedYieldPoolChange,
	selectedYieldChartType,
	onSelectedYieldChartTypeChange,
	selectedYieldChains,
	selectedYieldProjects,
	selectedYieldCategories,
	selectedYieldTokens,
	minTvl,
	maxTvl,
	onSelectedYieldChainsChange,
	onSelectedYieldProjectsChange,
	onSelectedYieldCategoriesChange,
	onSelectedYieldTokensChange,
	onMinTvlChange,
	onMaxTvlChange
}: YieldsChartTabProps) {
	const { data: yieldsData = [], isLoading: yieldsLoading } = useYieldsData()
	const [chainSearch, setChainSearch] = useState('')
	const [projectSearch, setProjectSearch] = useState('')
	const [tokenSearch, setTokenSearch] = useState('')
	const [poolSearch, setPoolSearch] = useState('')
	const [sortColumn, setSortColumn] = useState<'tvl' | 'apy'>('tvl')
	const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc')
	const [showPoolPicker, setShowPoolPicker] = useState(!selectedYieldPool)
	const chainListRef = useRef<HTMLDivElement | null>(null)
	const projectListRef = useRef<HTMLDivElement | null>(null)
	const tokenListRef = useRef<HTMLDivElement | null>(null)
	const poolListRef = useRef<HTMLDivElement | null>(null)
	const chainPopover = usePopoverStore({ placement: 'bottom-start' })
	const projectPopover = usePopoverStore({ placement: 'bottom-start' })
	const tokenPopover = usePopoverStore({ placement: 'bottom-start' })

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

	const tokenOptions = useMemo(() => {
		const tokenTvlMap = new Map<string, number>()
		yieldsData.forEach((p: any) => {
			const symbol = (p.pool || '') as string
			const baseSymbol = symbol.split('(')[0]
			baseSymbol
				.split('-')
				.map((token: string) => token.trim())
				.filter(Boolean)
				.forEach((token: string) => {
					const normalized = token.toUpperCase()
					if (!normalized) return
					const current = tokenTvlMap.get(normalized) || 0
					tokenTvlMap.set(normalized, current + (p.tvl || 0))
				})
		})

		const baseOptions = [
			{ value: 'ALL_BITCOINS', label: 'All Bitcoins' },
			{ value: 'ALL_USD_STABLES', label: 'All USD Stablecoins' }
		]

		const tokenOptionList = Array.from(tokenTvlMap.entries())
			.sort((a, b) => {
				if (b[1] !== a[1]) return b[1] - a[1]
				return a[0].localeCompare(b[0])
			})
			.map(([token]) => ({ value: token, label: token }))

		return [...baseOptions, ...tokenOptionList]
	}, [yieldsData])

	const filteredChainOptions = useMemo(() => {
		if (!chainSearch) return chainOptions
		return matchSorter(chainOptions, chainSearch, { keys: ['label'] })
	}, [chainOptions, chainSearch])

	const filteredProjectOptions = useMemo(() => {
		if (!projectSearch) return projectOptions
		return matchSorter(projectOptions, projectSearch, { keys: ['label'] })
	}, [projectOptions, projectSearch])

	const filteredTokenOptions = useMemo(() => {
		if (!tokenSearch) return tokenOptions
		return matchSorter(tokenOptions, tokenSearch, { keys: ['label'] })
	}, [tokenOptions, tokenSearch])

	const chainOpen = chainPopover.useState('open')
	const projectOpen = projectPopover.useState('open')
	const tokenOpen = tokenPopover.useState('open')

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

	const tokenVirtualizer = useVirtualizer({
		count: filteredTokenOptions.length,
		getScrollElement: () => tokenListRef.current,
		estimateSize: () => 44,
		overscan: 8
	})

	useEffect(() => {
		if (chainOpen) {
			setTimeout(() => chainVirtualizer.measure(), 0)
		}
	}, [chainOpen, chainVirtualizer])

	useEffect(() => {
		if (projectOpen) {
			setTimeout(() => projectVirtualizer.measure(), 0)
		}
	}, [projectOpen, projectVirtualizer])

	useEffect(() => {
		if (tokenOpen) {
			setTimeout(() => tokenVirtualizer.measure(), 0)
		}
	}, [tokenOpen, tokenVirtualizer])

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

	const toggleToken = (value: string) => {
		if (selectedYieldTokens.includes(value)) {
			onSelectedYieldTokensChange(selectedYieldTokens.filter((v) => v !== value))
		} else {
			onSelectedYieldTokensChange([...selectedYieldTokens, value])
		}
	}

	const normalizedSelectedTokens = useMemo(
		() => selectedYieldTokens.map((token) => token.toLowerCase()),
		[selectedYieldTokens]
	)

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

			if (normalizedSelectedTokens.length > 0) {
				const tokensInPool = (pool.pool || '')
					.split('(')[0]
					.split('-')
					.map((token: string) => token.toLowerCase().trim().replace('₮0', 't').replace('₮', 't'))
					.filter(Boolean)

				const matchesToken = normalizedSelectedTokens.some((token) => {
					if (token === 'all_bitcoins') {
						return tokensInPool.some((t) => t.includes('btc'))
					}
					if (token === 'all_usd_stables') {
						if (pool.stablecoin) return true
						return tokensInPool.some(
							(t) =>
								t.includes('usd') ||
								t.includes('usdt') ||
								t.includes('usdc') ||
								t.includes('usdp') ||
								t.includes('busd') ||
								t.includes('dai') ||
								t.includes('cust') ||
								t.includes('usds')
						)
					}
					if (token === 'eth') {
						return tokensInPool.some((t) => t === 'eth' || t.includes('weth'))
					}
					return tokensInPool.some((t) => t.includes(token))
				})

				if (!matchesToken) {
					return false
				}
			}

			if (minTvl !== null && pool.tvl < minTvl) {
				return false
			}
			if (maxTvl !== null && pool.tvl > maxTvl) {
				return false
			}

			return true
		})
	}, [
		yieldsData,
		selectedYieldChains,
		selectedYieldProjects,
		selectedYieldCategories,
		normalizedSelectedTokens,
		minTvl,
		maxTvl
	])

	const searchedAndSortedPools = useMemo(() => {
		let result = filteredPools

		if (poolSearch) {
			result = matchSorter(result, poolSearch, {
				keys: ['pool', 'project', (item: any) => item.chains?.[0] || '']
			})
		}

		return [...result].sort((a: any, b: any) => {
			const aVal = sortColumn === 'tvl' ? a.tvl || 0 : a.apy || 0
			const bVal = sortColumn === 'tvl' ? b.tvl || 0 : b.apy || 0
			return sortDirection === 'desc' ? bVal - aVal : aVal - bVal
		})
	}, [filteredPools, poolSearch, sortColumn, sortDirection])

	const poolListVirtualizer = useVirtualizer({
		count: searchedAndSortedPools.length,
		getScrollElement: () => poolListRef.current,
		estimateSize: () => 64,
		overscan: 8
	})

	const toggleSort = (column: 'tvl' | 'apy') => {
		if (sortColumn === column) {
			setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))
		} else {
			setSortColumn(column)
			setSortDirection('desc')
		}
	}

	const selectedPoolData = useMemo(() => {
		if (!selectedYieldPool) return null
		return yieldsData.find((p: any) => p.configID === selectedYieldPool.configID) || null
	}, [selectedYieldPool, yieldsData])

	const { data: selectedYieldChartData, isLoading: selectedYieldChartLoading } = useYieldChartData(
		selectedYieldPool?.configID || null
	)

	const { data: borrowChartData, isLoading: borrowChartLoading } = useYieldChartLendBorrow(
		selectedYieldPool?.configID || null
	)

	const availableChartTypes = useMemo(() => {
		const types: Array<{ value: string; label: string; available: boolean }> = [
			{ value: 'tvl-apy', label: 'TVL & APY', available: true }
		]

		if (selectedYieldChartData?.data) {
			const hasApyComponents = selectedYieldChartData.data.some((d: any) => d.apyBase !== null || d.apyReward !== null)
			types.push({
				value: 'supply-apy',
				label: 'Supply APY',
				available: hasApyComponents
			})
			types.push({
				value: 'supply-apy-7d',
				label: '7 Day Avg Supply APY',
				available: selectedYieldChartData.data.length >= 7
			})
		}

		if (borrowChartData?.data && borrowChartData.data.length > 0) {
			const hasBorrowApy = borrowChartData.data.some((d: any) => d.apyBaseBorrow !== null || d.apyRewardBorrow !== null)
			const hasLiquidityData = borrowChartData.data.some(
				(d: any) => d.totalSupplyUsd !== null && d.totalBorrowUsd !== null
			)

			types.push({
				value: 'borrow-apy',
				label: 'Borrow APY',
				available: hasBorrowApy
			})
			types.push({
				value: 'net-borrow-apy',
				label: 'Net Borrow APY',
				available: hasBorrowApy
			})
			types.push({
				value: 'pool-liquidity',
				label: 'Pool Liquidity',
				available: hasLiquidityData
			})
		}

		return types
	}, [selectedYieldChartData, borrowChartData])

	useEffect(() => {
		if (!selectedYieldPool) return

		const borrowTypes = ['borrow-apy', 'net-borrow-apy', 'pool-liquidity']
		const isBorrowType = borrowTypes.includes(selectedYieldChartType)

		if (isBorrowType && borrowChartLoading) return
		if (!isBorrowType && selectedYieldChartLoading) return

		const currentTypeAvailable = availableChartTypes.find((t) => t.value === selectedYieldChartType && t.available)
		if (!currentTypeAvailable) {
			onSelectedYieldChartTypeChange('tvl-apy')
		}
	}, [
		selectedYieldPool,
		availableChartTypes,
		selectedYieldChartType,
		onSelectedYieldChartTypeChange,
		borrowChartLoading,
		selectedYieldChartLoading
	])

	const {
		tvlApyData: yieldsChartData,
		supplyApyBarData,
		supplyApy7dData,
		borrowApyBarData,
		netBorrowApyData,
		poolLiquidityData,
		latestData: latestYieldData
	} = useYieldChartTransformations({
		chartData: selectedYieldChartData,
		borrowData: borrowChartData
	})

	const borrowTypes = ['borrow-apy', 'net-borrow-apy', 'pool-liquidity']
	const isPreviewLoading = borrowTypes.includes(selectedYieldChartType)
		? selectedYieldChartLoading || borrowChartLoading
		: selectedYieldChartLoading

	return (
		<div className="flex flex-col gap-4">
			{yieldsLoading ? (
				<div className="flex h-32 items-center justify-center">
					<LocalLoader />
				</div>
			) : (
				<div className="flex flex-col gap-4">
					<div className="grid grid-cols-5 gap-2">
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
										className="thin-scrollbar h-[240px] overflow-y-auto rounded-md bg-(--cards-bg-alt)/30"
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
										className="thin-scrollbar h-[240px] overflow-y-auto rounded-md bg-(--cards-bg-alt)/30"
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

						<div className="flex flex-col">
							<label className="pro-text2 mb-1 block text-[11px] font-medium">Tokens</label>
							<PopoverDisclosure
								store={tokenPopover}
								className="flex w-full items-center justify-between rounded-md border border-(--form-control-border) bg-(--bg-input) px-2 py-1.5 text-xs transition-colors hover:border-(--primary)/40 focus:border-(--primary) focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
							>
								<span className={selectedYieldTokens.length > 0 ? 'pro-text1' : 'pro-text3'}>
									{selectedYieldTokens.length > 0
										? `${selectedYieldTokens.length} token${selectedYieldTokens.length > 1 ? 's' : ''} selected`
										: 'All tokens'}
								</span>
								<Icon name="chevron-down" width={12} height={12} className="ml-2 flex-shrink-0 opacity-70" />
							</PopoverDisclosure>
							<Popover
								store={tokenPopover}
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
											value={tokenSearch}
											onChange={(e) => setTokenSearch(e.target.value)}
											placeholder="Search tokens..."
											className="w-full rounded-md border border-(--form-control-border) bg-(--bg-input) py-1.5 pr-2.5 pl-7 text-xs transition-colors focus:border-(--primary) focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
										/>
									</div>
									<div
										className="thin-scrollbar h-[240px] overflow-y-auto rounded-md bg-(--cards-bg-alt)/30"
										ref={tokenListRef}
									>
										<div
											className="p-1"
											style={{
												height: tokenVirtualizer.getTotalSize(),
												position: 'relative'
											}}
										>
											{tokenVirtualizer.getVirtualItems().map((row) => {
												const option = filteredTokenOptions[row.index]
												if (!option) return null
												const isActive = selectedYieldTokens.includes(option.value)
												return (
													<button
														key={option.value}
														onClick={() => toggleToken(option.value)}
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
														<span className="truncate">{option.label}</span>
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
									{selectedYieldTokens.length > 0 && (
										<div className="mt-2.5 flex items-center justify-between rounded-md border border-(--cards-border) bg-(--cards-bg-alt)/40 px-2.5 py-2">
											<span className="text-[11px] font-medium text-(--text-secondary)">
												{selectedYieldTokens.length} selected
											</span>
											<button
												type="button"
												onClick={() => {
													onSelectedYieldTokensChange([])
													setTokenSearch('')
												}}
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

						<div className="flex flex-col">
							<label className="pro-text2 mb-1 block text-[11px] font-medium">TVL Range</label>
							<div className="flex gap-1">
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

					{selectedYieldPool && !showPoolPicker ? (
						<div className="overflow-hidden rounded-lg border border-(--cards-border) bg-(--cards-bg)">
							<div className="flex items-center justify-between px-3 py-2.5">
								<div className="flex items-center gap-3">
									{selectedPoolData && (
										<img
											src={getItemIconUrl('protocol', null, selectedPoolData.project)}
											alt={selectedPoolData.project}
											className="h-8 w-8 rounded-full object-cover ring-1 ring-(--cards-border)"
											onError={(e) => {
												e.currentTarget.style.display = 'none'
											}}
										/>
									)}
									<div className="min-w-0">
										<div className="pro-text1 text-sm font-semibold">{selectedYieldPool.name}</div>
										<div className="flex items-center gap-2 text-xs text-(--text-tertiary)">
											<span>{selectedYieldPool.project}</span>
											<span>•</span>
											<span>{selectedYieldPool.chain}</span>
											{selectedPoolData && (
												<>
													<span>•</span>
													<span className="font-medium text-(--text-secondary)">
														TVL: {formattedNum(selectedPoolData.tvl, true)}
													</span>
													<span>•</span>
													<span className="font-medium text-(--text-secondary)">
														APY: {selectedPoolData.apy?.toFixed(2) || '0.00'}%
													</span>
												</>
											)}
										</div>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={() => setShowPoolPicker(true)}
										className="rounded-md border border-(--form-control-border) bg-(--bg-input) px-2.5 py-1.5 text-xs font-medium text-(--text-secondary) transition-colors hover:border-(--primary)/40 hover:text-(--text-primary)"
									>
										Change pool
									</button>
									<button
										type="button"
										onClick={() => {
											onSelectedYieldPoolChange(null)
											setShowPoolPicker(true)
										}}
										className="rounded-md border border-(--form-control-border) bg-(--bg-input) px-2.5 py-1.5 text-xs font-medium text-(--text-tertiary) transition-colors hover:border-red-500/40 hover:text-red-500"
									>
										Clear
									</button>
								</div>
							</div>
						</div>
					) : (
						<div className="overflow-hidden rounded-lg border border-(--cards-border)">
							<div className="flex items-center justify-between border-b border-(--cards-border) bg-(--cards-bg) px-3 py-2">
								<div className="flex items-center gap-3">
									<div className="relative">
										<Icon
											name="search"
											width={12}
											height={12}
											className="absolute top-1/2 left-2.5 -translate-y-1/2 text-(--text-tertiary)"
										/>
										<input
											value={poolSearch}
											onChange={(e) => setPoolSearch(e.target.value)}
											placeholder="Search pools..."
											className="w-48 rounded-md border border-(--form-control-border) bg-(--bg-input) py-1.5 pr-2.5 pl-7 text-xs transition-colors focus:border-(--primary) focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
										/>
									</div>
									<span className="pro-text3 text-xs">
										{filteredPools.length} pool{filteredPools.length !== 1 ? 's' : ''}
									</span>
								</div>
								{selectedYieldPool && (
									<button
										type="button"
										onClick={() => setShowPoolPicker(false)}
										className="text-xs font-medium text-(--primary) transition-colors hover:text-(--primary)/80"
									>
										Cancel
									</button>
								)}
							</div>

							<div className="grid grid-cols-[1fr_100px_100px_80px] gap-2 border-b border-(--cards-border) bg-(--cards-bg-alt)/50 px-3 py-2 text-[11px] font-medium">
								<div className="pro-text3">Pool</div>
								<button
									onClick={() => toggleSort('tvl')}
									className={`flex items-center justify-end gap-1 ${
										sortColumn === 'tvl' ? 'text-(--primary)' : 'pro-text3 hover:text-(--text-primary)'
									}`}
								>
									TVL
									<Icon
										name={sortColumn === 'tvl' && sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'}
										width={10}
										height={10}
										className={sortColumn === 'tvl' ? 'opacity-100' : 'opacity-30'}
									/>
								</button>
								<button
									onClick={() => toggleSort('apy')}
									className={`flex items-center justify-end gap-1 ${
										sortColumn === 'apy' ? 'text-(--primary)' : 'pro-text3 hover:text-(--text-primary)'
									}`}
								>
									APY
									<Icon
										name={sortColumn === 'apy' && sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'}
										width={10}
										height={10}
										className={sortColumn === 'apy' ? 'opacity-100' : 'opacity-30'}
									/>
								</button>
								<div className="pro-text3 text-right">Category</div>
							</div>

							<div ref={poolListRef} className="thin-scrollbar h-[240px] overflow-y-auto">
								{searchedAndSortedPools.length === 0 ? (
									<div className="pro-text3 flex h-full items-center justify-center text-xs">
										No pools match your search
									</div>
								) : (
									<div
										style={{
											height: poolListVirtualizer.getTotalSize(),
											position: 'relative'
										}}
									>
										{poolListVirtualizer.getVirtualItems().map((row) => {
											const pool = searchedAndSortedPools[row.index]
											if (!pool) return null
											const isSelected = selectedYieldPool?.configID === pool.configID
											const iconUrl = getItemIconUrl('protocol', null, pool.project)
											return (
												<button
													key={pool.configID}
													onClick={() => {
														onSelectedYieldPoolChange({
															configID: pool.configID,
															name: pool.pool,
															project: pool.project,
															chain: pool.chains[0]
														})
														setShowPoolPicker(false)
													}}
													className={`grid w-full grid-cols-[1fr_100px_100px_80px] items-center gap-2 px-3 py-2 text-left text-xs transition-all hover:bg-(--cards-bg-alt) ${
														isSelected ? 'bg-(--primary)/10' : ''
													}`}
													style={{
														position: 'absolute',
														top: 0,
														left: 0,
														width: '100%',
														transform: `translateY(${row.start}px)`
													}}
												>
													<div className="flex min-w-0 items-center gap-2">
														{iconUrl && (
															<img
																src={iconUrl}
																alt={pool.project}
																className="h-6 w-6 flex-shrink-0 rounded-full object-cover ring-1 ring-(--cards-border)"
																onError={(e) => {
																	e.currentTarget.style.display = 'none'
																}}
															/>
														)}
														<div className="min-w-0">
															<div className={`truncate font-medium ${isSelected ? 'text-(--primary)' : 'pro-text1'}`}>
																{pool.pool}
															</div>
															<div className="truncate text-[10px] text-(--text-tertiary)">
																{pool.project} • {pool.chains[0]}
															</div>
														</div>
													</div>

													<div className={`text-right font-medium ${isSelected ? 'text-(--primary)' : 'pro-text1'}`}>
														{formattedNum(pool.tvl, true)}
													</div>

													<div className="text-right">
														<div className={`font-medium ${isSelected ? 'text-(--primary)' : 'pro-text1'}`}>
															{pool.apy?.toFixed(2) || '0.00'}%
														</div>
														{pool.apyMean30d != null && (
															<div className="text-[10px] text-(--text-tertiary)">
																30d: {pool.apyMean30d.toFixed(2)}%
															</div>
														)}
													</div>

													<div className="text-right">
														{pool.category && (
															<span className="inline-block truncate rounded bg-(--cards-bg-alt) px-1.5 py-0.5 text-[10px] text-(--text-tertiary)">
																{pool.category}
															</span>
														)}
													</div>
												</button>
											)
										})}
									</div>
								)}
							</div>
						</div>
					)}

					{/* Chart Preview */}
					<div className="overflow-hidden rounded-lg border border-(--cards-border)">
						<div className="flex items-center justify-between border-b border-(--cards-border) bg-(--cards-bg) px-3 py-2">
							<span className="pro-text2 text-xs font-medium">
								{selectedYieldPool ? selectedYieldPool.name : 'Preview'}
							</span>
						</div>

						{/* Chart Type Pills */}
						{selectedYieldPool && (
							<div className="flex flex-wrap gap-1.5 border-b border-(--cards-border) bg-(--cards-bg) px-3 py-2">
								{availableChartTypes.map((type) => {
									const isLoading =
										borrowChartLoading && ['borrow-apy', 'net-borrow-apy', 'pool-liquidity'].includes(type.value)
									const isActive = selectedYieldChartType === type.value
									return (
										<button
											key={type.value}
											onClick={() => type.available && onSelectedYieldChartTypeChange(type.value)}
											disabled={!type.available || isLoading}
											className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
												isActive
													? 'bg-(--primary) text-white shadow-sm'
													: type.available
														? 'bg-(--cards-bg-alt) text-(--text-secondary) hover:bg-(--cards-bg-alt)/80 hover:text-(--text-primary)'
														: 'cursor-not-allowed bg-(--cards-bg-alt)/50 text-(--text-tertiary) opacity-50'
											}`}
										>
											{type.label}
											{isLoading && '...'}
										</button>
									)
								})}
							</div>
						)}

						{selectedYieldPool ? (
							<div className="bg-(--cards-bg) p-3">
								<div className="mb-2 flex items-center gap-2 text-xs">
									<span className="pro-text3">{selectedYieldPool.project}</span>
									<span className="pro-text3">•</span>
									<span className="pro-text3">{selectedYieldPool.chain}</span>
								</div>

								{selectedYieldChartType === 'tvl-apy' &&
									latestYieldData.apy !== null &&
									latestYieldData.tvl !== null && (
										<div className="mb-3 flex gap-4">
											<div className="flex flex-col">
												<span className="pro-text3 text-[10px] uppercase">Latest APY</span>
												<span
													className="font-jetbrains text-base font-semibold"
													style={{ color: mainChartStackColors.APY }}
												>
													{latestYieldData.apy}%
												</span>
											</div>
											<div className="flex flex-col">
												<span className="pro-text3 text-[10px] uppercase">TVL</span>
												<span
													className="font-jetbrains text-base font-semibold"
													style={{ color: mainChartStackColors.TVL }}
												>
													{formattedNum(latestYieldData.tvl, true)}
												</span>
											</div>
										</div>
									)}

								<div className="h-[280px]">
									{isPreviewLoading ? (
										<div className="flex h-full items-center justify-center">
											<LocalLoader />
										</div>
									) : (
										<Suspense
											fallback={
												<div className="flex h-full items-center justify-center">
													<LocalLoader />
												</div>
											}
										>
											{selectedYieldChartType === 'tvl-apy' && (
												<TVLAPYChart
													height="280px"
													chartData={yieldsChartData}
													stackColors={mainChartStackColors}
													stacks={mainChartStacks}
													title=""
													alwaysShowTooltip={false}
												/>
											)}
											{selectedYieldChartType === 'supply-apy' && (
												<BarChart
													height="280px"
													chartData={supplyApyBarData}
													stacks={barChartStacks}
													stackColors={barChartColors}
													title="Supply APY"
													valueSymbol="%"
												/>
											)}
											{selectedYieldChartType === 'supply-apy-7d' && (
												<AreaChart
													height="280px"
													chartData={supplyApy7dData}
													title="7 Day Avg Supply APY"
													valueSymbol="%"
													color={CHART_COLORS[0]}
												/>
											)}
											{selectedYieldChartType === 'borrow-apy' && (
												<BarChart
													height="280px"
													chartData={borrowApyBarData}
													stacks={barChartStacks}
													stackColors={barChartColors}
													title="Borrow APY"
													valueSymbol="%"
												/>
											)}
											{selectedYieldChartType === 'net-borrow-apy' && (
												<AreaChart
													height="280px"
													chartData={netBorrowApyData}
													title="Net Borrow APY"
													valueSymbol="%"
													color={CHART_COLORS[0]}
												/>
											)}
											{selectedYieldChartType === 'pool-liquidity' && (
												<AreaChart
													height="280px"
													chartData={poolLiquidityData}
													title="Pool Liquidity"
													customLegendName="Filter"
													customLegendOptions={liquidityLegendOptions}
													valueSymbol="$"
													stackColors={liquidityChartColors}
												/>
											)}
										</Suspense>
									)}
								</div>
							</div>
						) : (
							<div className="pro-text3 flex h-[280px] items-center justify-center bg-(--cards-bg) text-center">
								<div>
									<Icon name="bar-chart-2" height={32} width={32} className="mx-auto mb-1" />
									<div className="text-xs">Select a yield pool to see preview</div>
								</div>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	)
}
