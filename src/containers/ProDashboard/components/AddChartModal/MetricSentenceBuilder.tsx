import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	Combobox,
	ComboboxItem,
	ComboboxList,
	ComboboxProvider,
	Popover,
	useComboboxStore,
	usePopoverStore
} from '@ariakit/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { matchSorter } from 'match-sorter'
import { Icon } from '~/components/Icon'
import { Switch } from '~/components/Switch'
import { useAppMetadata } from '../../AppMetadataContext'
import type { Chain, MetricAggregator, MetricWindow, Protocol } from '../../types'
import { CHART_TYPES } from '../../types'
import { getItemIconUrl } from '../../utils'

const AGGREGATOR_OPTIONS: Array<{ value: MetricAggregator; label: string; description: string }> = [
	{ value: 'latest', label: 'Latest', description: 'Most recent value in the selected window' },
	{ value: 'avg', label: 'Average', description: 'Average of all values in the window' },
	{ value: 'max', label: 'Peak', description: 'Highest value in the window' },
	{ value: 'min', label: 'Low', description: 'Lowest value in the window' },
	{ value: 'sum', label: 'Total', description: 'Sum of all values in the window' },
	{ value: 'median', label: 'Median', description: 'Middle value, less affected by outliers' },
	{ value: 'stddev', label: 'Std Deviation', description: 'Measure of volatility and variance' },
	{ value: 'first', label: 'First', description: 'First value at the beginning of the window' },
	{ value: 'growth', label: 'Growth Rate', description: 'Percentage change from first to last value' },
	{ value: 'movingavg', label: 'Moving Average', description: 'Smoothed trend analysis over the window' }
]

const WINDOW_OPTIONS: Array<{ value: MetricWindow; label: string; description: string }> = [
	{ value: '7d', label: '7 days', description: 'Last 7 days' },
	{ value: '30d', label: '30 days', description: 'Last 30 days' },
	{ value: '90d', label: '90 days', description: 'Last 90 days' },
	{ value: '365d', label: '365 days', description: 'Last 365 days' },
	{ value: 'ytd', label: 'Year to date', description: 'From January 1st to today' },
	{ value: '3y', label: '3 years', description: 'Last 3 years' },
	{ value: 'all', label: 'All time', description: 'Entire history' }
]

type ActiveToken = 'aggregator' | 'metric' | 'subject' | 'window' | null

interface MetricSentenceBuilderProps {
	aggregator: MetricAggregator
	metricType: string
	metricSubjectType: 'chain' | 'protocol'
	metricChain: string | null
	metricProtocol: string | null
	metricWindow: MetricWindow
	showSparkline: boolean
	availableMetricTypes: string[]
	chains: Chain[]
	protocols: Protocol[]
	onAggregatorChange: (value: MetricAggregator) => void
	onMetricTypeChange: (value: string) => void
	onSubjectTypeChange: (value: 'chain' | 'protocol') => void
	onChainChange: (option: { value: string; label: string }) => void
	onProtocolChange: (option: { value: string; label: string }) => void
	onWindowChange: (value: MetricWindow) => void
	onShowSparklineChange: (value: boolean) => void
}

const getTokenWidth = (token: Exclude<ActiveToken, null>): number => {
	const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
	if (isMobile) {
		return Math.min(window.innerWidth - 32, token === 'subject' ? 340 : 280)
	}
	switch (token) {
		case 'aggregator':
			return 260
		case 'metric':
			return 320
		case 'subject':
			return 360
		case 'window':
			return 260
	}
}

interface TokenButtonProps {
	label: string
	secondary?: string
	onClick: () => void
	active?: boolean
}

const TokenButton = forwardRef<HTMLButtonElement, TokenButtonProps>(function TokenButtonInner(
	{ label, secondary, onClick, active },
	ref
) {
	return (
		<button
			type="button"
			onClick={onClick}
			data-metric-token="true"
			ref={ref}
			className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-all duration-150 focus:ring-2 focus:ring-(--primary)/40 focus:outline-hidden sm:px-2.5 sm:py-1 sm:text-sm ${
				active
					? 'border-(--primary) bg-(--primary)/12 text-(--primary) shadow-sm'
					: 'border-(--cards-border) bg-(--cards-bg) text-(--text-secondary) hover:border-(--primary)/30 hover:bg-(--cards-bg-alt) hover:text-(--text-primary)'
			}`}
		>
			<span className="max-w-[100px] truncate sm:max-w-[180px]">{label}</span>
			<Icon name="chevron-down" width={10} height={10} className="flex-shrink-0 opacity-70 sm:h-3 sm:w-3" />
			{secondary && <span className="sr-only">{secondary}</span>}
		</button>
	)
})

export function MetricSentenceBuilder({
	aggregator,
	metricType,
	metricSubjectType,
	metricChain,
	metricProtocol,
	metricWindow,
	showSparkline,
	availableMetricTypes,
	chains,
	protocols,
	onAggregatorChange,
	onMetricTypeChange,
	onSubjectTypeChange,
	onChainChange,
	onProtocolChange,
	onWindowChange,
	onShowSparklineChange
}: MetricSentenceBuilderProps) {
	const [activeToken, setActiveToken] = useState<ActiveToken>(null)
	const [searchTerm, setSearchTerm] = useState('')
	const [subjectTab, setSubjectTab] = useState<'chain' | 'protocol'>(metricSubjectType)
	const popover = usePopoverStore({
		placement: typeof window !== 'undefined' && window.innerWidth < 640 ? 'bottom' : 'right-start'
	})
	const subjectCombobox = useComboboxStore({ resetValueOnHide: true })
	const anchorRefs = useRef<Record<Exclude<ActiveToken, null>, HTMLButtonElement | null>>({
		aggregator: null,
		metric: null,
		subject: null,
		window: null
	})
	const [popoverWidth, setPopoverWidth] = useState(260)
	const isPopoverOpen = popover.useState('open')
	const subjectSearchValue = subjectCombobox.useState('value') ?? ''
	const chainListRef = useRef<HTMLDivElement | null>(null)
	const protocolListRef = useRef<HTMLDivElement | null>(null)
	const { availableProtocolChartTypes, availableChainChartTypes } = useAppMetadata()

	useEffect(() => {
		if (!isPopoverOpen) {
			setActiveToken(null)
		}
		if (!activeToken) {
			setSearchTerm('')
			setSubjectTab(metricSubjectType)
		}
		if (activeToken === 'subject') {
			subjectCombobox.setOpen(true)
			setTimeout(() => {
				const portal = document.querySelector('[data-metric-token] input') as HTMLInputElement | null
				portal?.focus()
			}, 10)
		} else {
			subjectCombobox.setValue('')
			subjectCombobox.setOpen(false)
		}
	}, [isPopoverOpen, activeToken, metricSubjectType, subjectCombobox])

	const closePopover = useCallback(() => {
		popover.setOpen(false)
		setActiveToken(null)
		subjectCombobox.setValue('')
		subjectCombobox.setOpen(false)
	}, [popover, subjectCombobox])

	const chainOptions = useMemo(
		() =>
			[...chains]
				.sort((a, b) => (b.tvl || 0) - (a.tvl || 0))
				.map((chain) => ({ value: chain.name, label: chain.name })),
		[chains]
	)

	const { protocolOptions, protocolFamilySet } = useMemo(() => {
		const childrenByParentId = new Map<string, Protocol[]>()
		const parentsOrSolo: Protocol[] = []

		for (const protocol of protocols) {
			if (protocol.parentProtocol) {
				const arr = childrenByParentId.get(protocol.parentProtocol) || []
				arr.push(protocol)
				childrenByParentId.set(protocol.parentProtocol, arr)
			} else {
				parentsOrSolo.push(protocol)
			}
		}

		parentsOrSolo.sort((a, b) => (b.tvl || 0) - (a.tvl || 0))

		const options: Array<{ value: string; label: string; logo?: string; isChild?: boolean }> = []
		const familySet = new Set<string>()

		for (const parent of parentsOrSolo) {
			if (!parent.slug) continue
			const childProtocols = (childrenByParentId.get(parent.id) || []).sort((a, b) => (b.tvl || 0) - (a.tvl || 0))
			if (childProtocols.length > 0) {
				familySet.add(parent.slug)
			}
			options.push({ value: parent.slug, label: parent.name, logo: parent.logo })
			for (const child of childProtocols) {
				if (!child.slug) continue
				options.push({ value: child.slug, label: child.name, logo: child.logo, isChild: true })
			}
		}

		for (const protocol of protocols) {
			if (!protocol.slug || !protocol.parentProtocol) continue
			const alreadyIncluded = options.some((option) => option.value === protocol.slug)
			if (alreadyIncluded) continue
			options.push({ value: protocol.slug, label: protocol.name, logo: protocol.logo, isChild: true })
		}

		return { protocolOptions: options, protocolFamilySet: familySet }
	}, [protocols])

	const globalAvailableMetricTypes = useMemo(() => {
		const set = new Set<string>()
		for (const chain of chains) {
			const geckoId = (chain as any).gecko_id
			for (const t of availableChainChartTypes(chain.name, { hasGeckoId: !!geckoId })) set.add(t)
		}
		for (const protocol of protocols) {
			if (!protocol.slug) continue
			const geckoId = (protocol as any).geckoId
			for (const t of availableProtocolChartTypes(protocol.slug, { hasGeckoId: !!geckoId })) set.add(t)
		}
		return Array.from(set)
	}, [chains, protocols, availableChainChartTypes, availableProtocolChartTypes])

	const baseMetricTypes = useMemo(() => {
		return availableMetricTypes.length > 0 ? availableMetricTypes : globalAvailableMetricTypes
	}, [availableMetricTypes, globalAvailableMetricTypes])

	const selectedProtocolOption = useMemo(
		() => protocolOptions.find((option) => option.value === metricProtocol) || null,
		[protocolOptions, metricProtocol]
	)

	const allowedChainNamesForMetric = useMemo(() => {
		if (!metricType) return null as Set<string> | null
		const s = new Set<string>()
		for (const chain of chains) {
			const geckoId = (chain as any).gecko_id
			const types = availableChainChartTypes(chain.name, { hasGeckoId: !!geckoId })
			if (types.includes(metricType)) s.add(chain.name)
		}
		return s
	}, [metricType, chains, availableChainChartTypes])

	const chainOptionsByMetric = useMemo(() => {
		if (!allowedChainNamesForMetric) return chainOptions
		return chainOptions.filter((o) => allowedChainNamesForMetric.has(o.value))
	}, [chainOptions, allowedChainNamesForMetric])

	const filteredChainOptions = useMemo(() => {
		if (!subjectSearchValue) return chainOptionsByMetric
		return matchSorter(chainOptionsByMetric, subjectSearchValue, { keys: ['label'] })
	}, [chainOptionsByMetric, subjectSearchValue])

	const allowedProtocolSlugsForMetric = useMemo(() => {
		if (!metricType) return null as Set<string> | null
		const s = new Set<string>()
		for (const protocol of protocols) {
			if (!protocol.slug) continue
			const geckoId = (protocol as any).geckoId
			const types = availableProtocolChartTypes(protocol.slug, { hasGeckoId: !!geckoId })
			if (types.includes(metricType)) s.add(protocol.slug)
		}
		return s
	}, [metricType, protocols, availableProtocolChartTypes])

	const protocolOptionsByMetric = useMemo(() => {
		if (!allowedProtocolSlugsForMetric) return protocolOptions
		return protocolOptions.filter((o) => allowedProtocolSlugsForMetric.has(o.value))
	}, [protocolOptions, allowedProtocolSlugsForMetric])

	const filteredProtocolOptions = useMemo(() => {
		if (!subjectSearchValue) return protocolOptionsByMetric
		return matchSorter(protocolOptionsByMetric, subjectSearchValue, { keys: ['label'] })
	}, [protocolOptionsByMetric, subjectSearchValue])

	const chainVirtualizer = useVirtualizer({
		count: subjectTab === 'chain' ? filteredChainOptions.length : 0,
		getScrollElement: () => chainListRef.current,
		estimateSize: () => 38,
		overscan: 8
	})

	const protocolVirtualizer = useVirtualizer({
		count: subjectTab === 'protocol' ? filteredProtocolOptions.length : 0,
		getScrollElement: () => protocolListRef.current,
		estimateSize: () => 42,
		overscan: 8
	})

	const aggregatorLabel = useMemo(
		() => AGGREGATOR_OPTIONS.find((option) => option.value === aggregator)?.label ?? 'Latest',
		[aggregator]
	)

	const metricLabel = useMemo(() => {
		if (!metricType) return 'metric'
		return CHART_TYPES[metricType as keyof typeof CHART_TYPES]?.title || metricType
	}, [metricType])

	const windowLabel = useMemo(
		() => WINDOW_OPTIONS.find((option) => option.value === metricWindow)?.label ?? 'window',
		[metricWindow]
	)

	const subjectLabel = useMemo(() => {
		if (metricSubjectType === 'chain') {
			if (!metricChain) return 'a chain'
			return metricChain
		}
		if (!metricProtocol) return 'a protocol'
		const option = protocolOptions.find((opt) => opt.value === metricProtocol)
		if (!option) return metricProtocol
		return option.label
	}, [metricSubjectType, metricChain, metricProtocol, protocolOptions, protocolFamilySet])

	const filteredMetrics = useMemo(() => {
		if (!searchTerm) return baseMetricTypes
		const term = searchTerm.toLowerCase()
		return baseMetricTypes.filter((value) => {
			const label = CHART_TYPES[value as keyof typeof CHART_TYPES]?.title || value
			return label.toLowerCase().includes(term) || value.toLowerCase().includes(term)
		})
	}, [baseMetricTypes, searchTerm])

	const handleTokenClick = useCallback(
		(token: Exclude<ActiveToken, null>) => {
			if (activeToken === token) {
				closePopover()
				return
			}

			const anchor = anchorRefs.current[token]
			if (!anchor) return

			if (token === 'subject') {
				setSubjectTab(metricSubjectType)
			}

			setPopoverWidth(getTokenWidth(token))
			setActiveToken(token)
			popover.setAnchorElement(anchor)
			popover.setOpen(true)
		},
		[activeToken, closePopover, metricSubjectType, popover, subjectCombobox]
	)

	const handleChainSelect = useCallback(
		(option: any) => {
			onSubjectTypeChange('chain')
			onChainChange(option)
		},
		[onChainChange, onSubjectTypeChange]
	)

	const handleProtocolSelect = useCallback(
		(option: any) => {
			onSubjectTypeChange('protocol')
			onProtocolChange(option)
		},
		[onProtocolChange, onSubjectTypeChange]
	)

	const handleSelectMetric = useCallback(
		(value: string) => {
			onMetricTypeChange(value)
			closePopover()
		},
		[closePopover, onMetricTypeChange]
	)

	const handleSelectAggregator = useCallback(
		(value: MetricAggregator) => {
			onAggregatorChange(value)
			closePopover()
		},
		[closePopover, onAggregatorChange]
	)

	const handleSelectWindow = useCallback(
		(value: MetricWindow) => {
			onWindowChange(value)
			closePopover()
		},
		[closePopover, onWindowChange]
	)

	const renderPopoverContent = () => {
		switch (activeToken) {
			case 'aggregator':
				return (
					<div className="thin-scrollbar max-h-[280px] overflow-y-auto p-1.5" data-metric-token="true">
						{AGGREGATOR_OPTIONS.map((option) => (
							<button
								key={option.value}
								type="button"
								onClick={() => handleSelectAggregator(option.value)}
								className={`w-full rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-(--cards-bg-alt) ${
									option.value === aggregator
										? 'bg-(--cards-bg-alt) font-semibold text-(--text-primary)'
										: 'text-(--text-secondary)'
								}`}
							>
								<div>{option.label}</div>
								<div className="text-xs text-(--text-tertiary)">{option.description}</div>
							</button>
						))}
					</div>
				)
			case 'window':
				return (
					<div className="thin-scrollbar max-h-[280px] overflow-y-auto p-1.5" data-metric-token="true">
						{WINDOW_OPTIONS.map((option) => (
							<button
								key={option.value}
								type="button"
								onClick={() => handleSelectWindow(option.value)}
								className={`w-full rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-(--cards-bg-alt) ${
									option.value === metricWindow
										? 'bg-(--cards-bg-alt) font-semibold text-(--text-primary)'
										: 'text-(--text-secondary)'
								}`}
							>
								<div>{option.label}</div>
								<div className="text-xs text-(--text-tertiary)">{option.description}</div>
							</button>
						))}
					</div>
				)
			case 'metric':
				return (
					<div className="thin-scrollbar max-h-[320px] w-full overflow-y-auto" data-metric-token="true">
						<div className="sticky top-0 border-b border-(--cards-border) bg-(--cards-bg) p-1.5">
							<input
								autoFocus
								value={searchTerm}
								onChange={(event) => setSearchTerm(event.target.value)}
								placeholder="Search metrics..."
								className="w-full rounded-md border border-(--form-control-border) bg-(--bg-input) px-2 py-1.5 text-sm focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
							/>
						</div>
						<div className="p-1.5">
							{baseMetricTypes.length === 0 && <div className="pro-text3 px-2 py-3 text-sm">No metrics available.</div>}
							{baseMetricTypes.length > 0 && filteredMetrics.length === 0 && (
								<div className="pro-text3 px-2 py-3 text-sm">No metrics match that search.</div>
							)}
							{filteredMetrics.map((value) => {
								const label = CHART_TYPES[value as keyof typeof CHART_TYPES]?.title || value
								const isActive = value === metricType
								return (
									<button
										key={value}
										type="button"
										onClick={() => handleSelectMetric(value)}
										className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-(--cards-bg-alt) ${
											isActive ? 'bg-(--cards-bg-alt) font-semibold text-(--text-primary)' : 'text-(--text-secondary)'
										}`}
									>
										<span>{label}</span>
										{isActive && <Icon name="check" width={14} height={14} />}
									</button>
								)
							})}
						</div>
					</div>
				)
			case 'subject':
				return (
					<ComboboxProvider store={subjectCombobox}>
						<div className="w-full space-y-2.5 p-2.5 sm:space-y-3 sm:p-3" data-metric-token="true">
							<div className="space-y-1.5">
								<div className="text-[11px] font-semibold tracking-wide text-(--text-tertiary) uppercase">
									Select subject
								</div>
								<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg-alt)/60 p-0.5 shadow-sm">
									<div className="grid grid-cols-2 gap-1">
										<button
											type="button"
											onClick={() => {
												setSubjectTab('chain')
												subjectCombobox.setValue('')
											}}
											className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
												subjectTab === 'chain'
													? 'bg-(--primary)/12 text-(--primary) shadow-sm'
													: 'text-(--text-secondary) hover:bg-(--cards-bg)'
											}`}
										>
											<div className="flex items-center justify-center gap-2">
												<Icon
													name="chain"
													width={14}
													height={14}
													className={subjectTab === 'chain' ? 'text-(--primary)' : 'text-(--text-tertiary)'}
												/>
												<span>Chains</span>
											</div>
										</button>
										<button
											type="button"
											onClick={() => {
												setSubjectTab('protocol')
												subjectCombobox.setValue('')
											}}
											className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
												subjectTab === 'protocol'
													? 'bg-(--primary)/12 text-(--primary) shadow-sm'
													: 'text-(--text-secondary) hover:bg-(--cards-bg)'
											}`}
										>
											<div className="flex items-center justify-center gap-2">
												<Icon
													name="protocol"
													width={14}
													height={14}
													className={subjectTab === 'protocol' ? 'text-(--primary)' : 'text-(--text-tertiary)'}
												/>
												<span>Protocols</span>
											</div>
										</button>
									</div>
								</div>
							</div>

							<div className="space-y-2">
								<div className="rounded-lg border border-dashed border-(--cards-border) bg-(--cards-bg) p-2.5 shadow-inner">
									<Combobox
										autoFocus
										placeholder={subjectTab === 'chain' ? 'Search chains...' : 'Search protocols...'}
										className="mb-1.5 w-full rounded-md border border-(--form-control-border) bg-(--bg-input) px-2.5 py-1.5 text-sm focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
										aria-label="Search"
									/>
									{subjectTab === 'chain' ? (
										filteredChainOptions.length > 0 ? (
											<ComboboxList ref={chainListRef} className="thin-scrollbar max-h-[240px] overflow-y-auto">
												<div style={{ height: chainVirtualizer.getTotalSize(), position: 'relative' }}>
													{chainVirtualizer.getVirtualItems().map((virtualRow) => {
														const option = filteredChainOptions[virtualRow.index]
														if (!option) return null
														const isActive = metricChain === option.value
														const iconUrl = getItemIconUrl('chain', null, option.value)
														return (
															<ComboboxItem
																key={option.value}
																value={option.value}
																setValueOnClick={false}
																onClick={() => {
																	handleChainSelect(option)
																	closePopover()
																}}
																className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-(--cards-bg-alt) focus-visible:bg-(--cards-bg-alt) data-active-item:bg-(--cards-bg-alt) ${
																	isActive
																		? 'bg-(--primary)/10 font-semibold text-(--text-primary)'
																		: 'text-(--text-secondary)'
																}`}
																style={{
																	position: 'absolute',
																	top: 0,
																	left: 0,
																	width: '100%',
																	transform: `translateY(${virtualRow.start}px)`
																}}
															>
																<div className="flex min-w-0 items-center gap-2">
																	{iconUrl ? (
																		<img
																			src={iconUrl}
																			alt={option.label}
																			className="h-5 w-5 rounded-full object-cover"
																			onError={(event) => {
																				const target = event.currentTarget
																				target.style.display = 'none'
																			}}
																		/>
																	) : null}
																	<span className="truncate">{option.label}</span>
																</div>
																{isActive && <Icon name="check" width={14} height={14} />}
															</ComboboxItem>
														)
													})}
												</div>
											</ComboboxList>
										) : (
											<div className="px-2 py-6 text-center text-sm text-(--text-tertiary)">No chains found.</div>
										)
									) : filteredProtocolOptions.length > 0 ? (
										<ComboboxList ref={protocolListRef} className="thin-scrollbar max-h-[240px] overflow-y-auto">
											<div style={{ height: protocolVirtualizer.getTotalSize(), position: 'relative' }}>
												{protocolVirtualizer.getVirtualItems().map((virtualRow) => {
													const option = filteredProtocolOptions[virtualRow.index]
													if (!option) return null
													const isActive = metricProtocol === option.value
													const iconUrl = getItemIconUrl('protocol', option, option.value)
													return (
														<ComboboxItem
															key={option.value}
															value={option.value}
															setValueOnClick={false}
															onClick={() => {
																handleProtocolSelect(option)
																closePopover()
															}}
															className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-(--cards-bg-alt) focus-visible:bg-(--cards-bg-alt) data-active-item:bg-(--cards-bg-alt) ${
																isActive
																	? 'bg-(--primary)/10 font-semibold text-(--text-primary)'
																	: 'text-(--text-secondary)'
															}`}
															style={{
																position: 'absolute',
																top: 0,
																left: 0,
																width: '100%',
																transform: `translateY(${virtualRow.start}px)`
															}}
														>
															<div className={`flex min-w-0 items-center gap-2 ${option.isChild ? 'pl-4' : ''}`}>
																{iconUrl ? (
																	<img
																		src={option.logo || iconUrl}
																		alt={option.label}
																		className={`h-5 w-5 rounded-full object-cover ${option.isChild ? 'opacity-80' : ''}`}
																		onError={(event) => {
																			const target = event.currentTarget
																			target.style.display = 'none'
																		}}
																	/>
																) : null}
																<div className="flex min-w-0 flex-col">
																	<span
																		className={`truncate ${option.isChild ? 'text-(--text-secondary)' : 'text-(--text-primary)'}`}
																	>
																		{option.label}
																	</span>
																	{option.isChild && (
																		<span className="text-[11px] text-(--text-tertiary)">Child protocol</span>
																	)}
																</div>
															</div>
															{isActive && <Icon name="check" width={14} height={14} />}
														</ComboboxItem>
													)
												})}
											</div>
										</ComboboxList>
									) : (
										<div className="px-2 py-6 text-center text-sm text-(--text-tertiary)">No protocols found.</div>
									)}
								</div>
							</div>
						</div>
					</ComboboxProvider>
				)
			default:
				return null
		}
	}

	const handleTokenPress = (token: Exclude<ActiveToken, null>) => () => {
		handleTokenClick(token)
	}

	return (
		<div className="flex flex-col gap-2.5 sm:gap-3">
			<div className="rounded-lg border border-(--cards-border) bg-gradient-to-br from-(--cards-bg) via-(--cards-bg) to-(--cards-bg-alt) p-2.5 shadow-sm sm:p-3">
				<div className="flex items-center gap-2 sm:gap-2.5">
					<div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-(--primary)/12 text-(--primary) sm:h-8 sm:w-8">
						<Icon name="sparkles" width={14} height={14} className="sm:h-4 sm:w-4" />
					</div>
					<div className="min-w-0">
						<div className="text-xs font-semibold text-(--text-primary)">Metric sentence builder</div>
						<div className="text-[10px] text-(--text-tertiary) sm:text-[11px]">
							Create metrics based on natural language
						</div>
					</div>
				</div>
			</div>
			<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-2.5 text-sm text-(--text-secondary) shadow-sm sm:p-3">
				<div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-(--text-primary) sm:gap-x-2.5 sm:gap-y-2">
					<span className="text-xs text-(--text-tertiary) sm:text-sm">Show</span>
					<TokenButton
						label={aggregatorLabel}
						onClick={handleTokenPress('aggregator')}
						active={activeToken === 'aggregator'}
						ref={(node) => {
							anchorRefs.current.aggregator = node
						}}
					/>
					<TokenButton
						label={metricLabel || 'metric'}
						onClick={handleTokenPress('metric')}
						active={activeToken === 'metric'}
						ref={(node) => {
							anchorRefs.current.metric = node
						}}
					/>
					<span className="text-xs text-(--text-tertiary) sm:text-sm">for</span>
					<TokenButton
						label={subjectLabel}
						onClick={handleTokenPress('subject')}
						active={activeToken === 'subject'}
						ref={(node) => {
							anchorRefs.current.subject = node
						}}
					/>
					<span className="text-xs text-(--text-tertiary) sm:text-sm">over</span>
					<TokenButton
						label={windowLabel}
						onClick={handleTokenPress('window')}
						active={activeToken === 'window'}
						ref={(node) => {
							anchorRefs.current.window = node
						}}
					/>
				</div>
				<div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-(--cards-border) bg-(--cards-bg-alt)/50 px-2 py-1.5 sm:mt-3 sm:px-2.5">
					<Switch
						label="Sparkline"
						checked={showSparkline}
						onChange={() => onShowSparklineChange(!showSparkline)}
						value="sparkline"
						help="Display a tiny trendline inside your metric tile."
						className="text-[11px] font-medium text-(--text-secondary) sm:text-xs"
					/>
				</div>
			</div>
			<Popover
				store={popover}
				modal={false}
				data-metric-token="true"
				className="z-50 rounded-lg border border-(--cards-border) bg-(--cards-bg) shadow-lg"
				style={{
					width: popoverWidth,
					maxWidth: 'calc(100vw - 16px)',
					maxHeight: 'calc(100vh - 32px)',
					overflow: 'hidden auto'
				}}
			>
				{renderPopoverContent()}
			</Popover>
		</div>
	)
}
