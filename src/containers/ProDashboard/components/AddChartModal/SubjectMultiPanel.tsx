import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Popover, PopoverDisclosure, usePopoverStore } from '@ariakit/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { matchSorter } from 'match-sorter'
import { Icon } from '~/components/Icon'
import { useAppMetadata } from '../../AppMetadataContext'
import { useProDashboard } from '../../ProDashboardAPIContext'
import { getItemIconUrl } from '../../utils'
import { ChartTabType } from './types'

interface Option {
	value: string
	label: string
	logo?: string
	isChild?: boolean
}

interface SubjectMultiPanelProps {
	activeTab: ChartTabType
	onTabChange: (tab: ChartTabType) => void
	selectedChartType: string | null
	chainOptions: Array<{ value: string; label: string }>
	protocolOptions: Array<Option>
	selectedChains: string[]
	onSelectedChainsChange: (values: string[]) => void
	selectedProtocols: string[]
	onSelectedProtocolsChange: (values: string[]) => void
	isLoading: boolean
	hideTabToggle?: boolean
}

export const SubjectMultiPanel = memo(function SubjectMultiPanel({
	activeTab,
	onTabChange,
	selectedChartType,
	chainOptions,
	protocolOptions,
	selectedChains,
	onSelectedChainsChange,
	selectedProtocols,
	onSelectedProtocolsChange,
	isLoading,
	hideTabToggle = false
}: SubjectMultiPanelProps) {
	const [search, setSearch] = useState('')
	const chainListRef = useRef<HTMLDivElement | null>(null)
	const protocolListRef = useRef<HTMLDivElement | null>(null)
	const popover = usePopoverStore({ placement: 'bottom-start' })
	const isPopoverOpen = popover.useState('open')
	const { availableProtocolChartTypes, availableChainChartTypes } = useAppMetadata()
	const { protocols, chains } = useProDashboard()

	const baseChainOptions = useMemo(() => chainOptions.filter((o) => o.value !== 'All'), [chainOptions])

	const allowedChainNames = useMemo(() => {
		if (!selectedChartType) return null as Set<string> | null
		const s = new Set<string>()
		for (const c of chains) {
			const geckoId = (c as any).gecko_id
			const types = availableChainChartTypes(c.name, { hasGeckoId: !!geckoId })
			if (types.includes(selectedChartType)) s.add(c.name)
		}
		return s
	}, [selectedChartType, chains, availableChainChartTypes])

	const filteredChainOptions = useMemo(() => {
		const source = allowedChainNames ? baseChainOptions.filter((o) => allowedChainNames.has(o.value)) : baseChainOptions
		if (!search) return source
		return matchSorter(source, search, { keys: ['label'] })
	}, [baseChainOptions, allowedChainNames, search])

	const allowedProtocolSlugs = useMemo(() => {
		if (!selectedChartType) return null as Set<string> | null
		const s = new Set<string>()
		for (const p of protocols) {
			if (!p.slug) continue
			const geckoId = (p as any).geckoId
			const types = availableProtocolChartTypes(p.slug, { hasGeckoId: !!geckoId })
			if (types.includes(selectedChartType)) s.add(p.slug)
		}
		return s
	}, [selectedChartType, protocols, availableProtocolChartTypes])

	const filteredProtocolOptions = useMemo(() => {
		const source = allowedProtocolSlugs
			? protocolOptions.filter((o) => allowedProtocolSlugs.has(o.value))
			: protocolOptions
		if (!search) return source
		return matchSorter(source, search, { keys: ['label'] })
	}, [protocolOptions, allowedProtocolSlugs, search])

	const chainVirtualizer = useVirtualizer({
		count: activeTab === 'chain' ? filteredChainOptions.length : 0,
		getScrollElement: () => chainListRef.current,
		estimateSize: () => 44,
		overscan: 8
	})

	const protocolVirtualizer = useVirtualizer({
		count: activeTab === 'protocol' ? filteredProtocolOptions.length : 0,
		getScrollElement: () => protocolListRef.current,
		estimateSize: () => 48,
		overscan: 8
	})

	useEffect(() => {
		if (!isPopoverOpen) return

		chainVirtualizer.measure()
		protocolVirtualizer.measure()

		if (activeTab === 'chain' && filteredChainOptions.length > 0) {
			chainVirtualizer.scrollToIndex(0, { align: 'start' })
		}

		if (activeTab === 'protocol' && filteredProtocolOptions.length > 0) {
			protocolVirtualizer.scrollToIndex(0, { align: 'start' })
		}
	}, [isPopoverOpen, activeTab, filteredChainOptions.length, filteredProtocolOptions.length])

	const toggleChain = (value: string) => {
		if (selectedChains.includes(value)) {
			onSelectedChainsChange(selectedChains.filter((v) => v !== value))
		} else {
			onSelectedChainsChange([...selectedChains, value])
		}
	}

	const toggleProtocol = (value: string) => {
		if (selectedProtocols.includes(value)) {
			onSelectedProtocolsChange(selectedProtocols.filter((v) => v !== value))
		} else {
			onSelectedProtocolsChange([...selectedProtocols, value])
		}
	}

	const getButtonLabel = () => {
		const totalSelected = selectedChains.length + selectedProtocols.length
		if (totalSelected === 0) {
			return 'Select chains & protocols...'
		}
		const parts = []
		if (selectedChains.length > 0) {
			parts.push(`${selectedChains.length} chain${selectedChains.length > 1 ? 's' : ''}`)
		}
		if (selectedProtocols.length > 0) {
			parts.push(`${selectedProtocols.length} protocol${selectedProtocols.length > 1 ? 's' : ''}`)
		}
		return parts.join(', ') + ' selected'
	}

	const hasSelection = selectedChains.length > 0 || selectedProtocols.length > 0

	return (
		<div className="flex flex-col">
			<label className="pro-text2 mb-2 text-xs font-medium">Select Chains & Protocols</label>
			<PopoverDisclosure
				store={popover}
				className="flex w-full items-center justify-between rounded-md border border-(--form-control-border) bg-(--bg-input) px-2.5 py-1.5 text-xs transition-colors hover:border-(--primary)/40 focus:border-(--primary) focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
			>
				<span className={`truncate ${hasSelection ? 'text-(--text-primary)' : 'text-(--text-tertiary)'}`}>
					{getButtonLabel()}
				</span>
				<Icon name="chevron-down" width={12} height={12} className="ml-2 flex-shrink-0 opacity-70" />
			</PopoverDisclosure>
			<Popover
				store={popover}
				modal={false}
				portal={true}
				gutter={4}
				flip={false}
				className="z-50 rounded-md border border-(--cards-border) bg-(--cards-bg) shadow-xl"
				style={{
					width: 'var(--popover-anchor-width)'
				}}
			>
				<div className="p-2.5">
					{!hideTabToggle && (
						<div className="mb-2.5 rounded-lg border border-(--cards-border) bg-(--cards-bg-alt)/60 p-1">
							<div className="grid grid-cols-2 gap-1">
								<button
									type="button"
									onClick={() => onTabChange('chain')}
									className={`group rounded-md px-3 py-2.5 text-xs font-semibold transition-all ${
										activeTab === 'chain'
											? 'bg-(--primary)/10 text-(--primary) shadow-sm'
											: 'text-(--text-secondary) hover:bg-(--cards-bg) hover:text-(--text-primary)'
									}`}
								>
									<div className="flex items-center justify-center gap-2">
										<Icon
											name="chain"
											width={14}
											height={14}
											className={
												activeTab === 'chain'
													? 'text-(--primary)'
													: 'text-(--text-tertiary) transition-colors group-hover:text-(--text-secondary)'
											}
										/>
										<span>Chains</span>
										{selectedChains.length > 0 && (
											<span
												className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
													activeTab === 'chain'
														? 'bg-(--primary)/20 text-(--primary)'
														: 'bg-(--cards-bg-alt) text-(--text-tertiary)'
												}`}
											>
												{selectedChains.length}
											</span>
										)}
									</div>
								</button>
								<button
									type="button"
									onClick={() => onTabChange('protocol')}
									className={`group rounded-md px-3 py-2.5 text-xs font-semibold transition-all ${
										activeTab === 'protocol'
											? 'bg-(--primary)/10 text-(--primary) shadow-sm'
											: 'text-(--text-secondary) hover:bg-(--cards-bg) hover:text-(--text-primary)'
									}`}
								>
									<div className="flex items-center justify-center gap-2">
										<Icon
											name="protocol"
											width={14}
											height={14}
											className={
												activeTab === 'protocol'
													? 'text-(--primary)'
													: 'text-(--text-tertiary) transition-colors group-hover:text-(--text-secondary)'
											}
										/>
										<span>Protocols</span>
										{selectedProtocols.length > 0 && (
											<span
												className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
													activeTab === 'protocol'
														? 'bg-(--primary)/20 text-(--primary)'
														: 'bg-(--cards-bg-alt) text-(--text-tertiary)'
												}`}
											>
												{selectedProtocols.length}
											</span>
										)}
									</div>
								</button>
							</div>
						</div>
					)}

					<div className="relative mb-2.5">
						<Icon
							name="search"
							width={12}
							height={12}
							className="absolute top-1/2 left-2.5 -translate-y-1/2 text-(--text-tertiary)"
						/>
						<input
							autoFocus
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder={activeTab === 'chain' ? 'Search chains...' : 'Search protocols...'}
							className="w-full rounded-md border border-(--form-control-border) bg-(--bg-input) py-1.5 pr-2.5 pl-7 text-xs transition-colors focus:border-(--primary) focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
						/>
					</div>
					<div
						className="thin-scrollbar max-h-[300px] overflow-y-auto rounded-md border border-(--cards-border) bg-(--cards-bg-alt)/30"
						ref={activeTab === 'chain' ? chainListRef : protocolListRef}
					>
						<div
							className="p-1"
							style={{
								height: (activeTab === 'chain' ? chainVirtualizer : protocolVirtualizer).getTotalSize(),
								position: 'relative'
							}}
						>
							{activeTab === 'chain'
								? chainVirtualizer.getVirtualItems().map((row) => {
										const option = filteredChainOptions[row.index]
										if (!option) return null
										const isActive = selectedChains.includes(option.value)
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
													{iconUrl ? (
														<img
															src={iconUrl}
															alt={option.label}
															className="h-5 w-5 rounded-full object-cover ring-1 ring-(--cards-border)"
															onError={(e) => {
																const t = e.currentTarget
																t.style.display = 'none'
															}}
														/>
													) : null}
													<span className="truncate">{option.label}</span>
												</div>
												{isActive && (
													<Icon name="check" width={14} height={14} className="ml-2 flex-shrink-0 text-(--primary)" />
												)}
											</button>
										)
									})
								: protocolVirtualizer.getVirtualItems().map((row) => {
										const option = filteredProtocolOptions[row.index]
										if (!option) return null
										const isActive = selectedProtocols.includes(option.value)
										const iconUrl = getItemIconUrl('protocol', option, option.value)
										return (
											<button
												key={option.value}
												onClick={() => toggleProtocol(option.value)}
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
												<div className={`flex min-w-0 items-center gap-2.5 ${option.isChild ? 'pl-4' : ''}`}>
													{iconUrl ? (
														<img
															src={option.logo || iconUrl}
															alt={option.label}
															className={`h-5 w-5 rounded-full object-cover ring-1 ring-(--cards-border) ${
																option.isChild ? 'opacity-70' : ''
															}`}
															onError={(e) => {
																const t = e.currentTarget
																t.style.display = 'none'
															}}
														/>
													) : null}
													<div className="flex min-w-0 flex-col">
														<span className={`truncate ${option.isChild ? 'text-(--text-secondary)' : ''}`}>
															{option.label}
														</span>
														{option.isChild && (
															<span className="text-[10px] text-(--text-tertiary)">Child protocol</span>
														)}
													</div>
												</div>
												{isActive && (
													<Icon name="check" width={14} height={14} className="ml-2 flex-shrink-0 text-(--primary)" />
												)}
											</button>
										)
									})}
						</div>
					</div>
					{(selectedChains.length > 0 || selectedProtocols.length > 0) && (
						<div className="mt-2.5 flex items-center justify-between rounded-md border border-(--cards-border) bg-(--cards-bg-alt)/40 px-2.5 py-2">
							<div className="flex items-center gap-2">
								<div className="flex h-5 w-5 items-center justify-center rounded-full bg-(--primary)/15">
									<Icon name="check" width={10} height={10} className="text-(--primary)" />
								</div>
								<span className="text-[11px] font-medium text-(--text-secondary)">
									{selectedChains.length > 0 && selectedProtocols.length > 0
										? `${selectedChains.length + selectedProtocols.length} items selected`
										: activeTab === 'chain'
											? `${selectedChains.length} selected`
											: `${selectedProtocols.length} selected`}
								</span>
							</div>
							<button
								type="button"
								onClick={() => {
									onSelectedChainsChange([])
									onSelectedProtocolsChange([])
								}}
								className="text-[11px] font-medium text-(--text-tertiary) transition-colors hover:text-(--primary)"
							>
								Clear All
							</button>
						</div>
					)}
				</div>
			</Popover>
		</div>
	)
})
