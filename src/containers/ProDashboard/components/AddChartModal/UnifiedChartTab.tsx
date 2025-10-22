import { useMemo } from 'react'
import { Icon } from '~/components/Icon'
import { Switch } from '~/components/Switch'
import { useAppMetadata } from '../../AppMetadataContext'
import { useProDashboard } from '../../ProDashboardAPIContext'
import { CHART_TYPES, ChartConfig, getChainChartTypes, getProtocolChartTypes } from '../../types'
import { AriakitSelect } from '../AriakitSelect'
import { CombinedChartPreview } from './CombinedChartPreview'
import { ComposerItemsCarousel } from './ComposerItemsCarousel'
import { SubjectMultiPanel } from './SubjectMultiPanel'
import { ChartTabType } from './types'
import { YieldsChartTab } from './YieldsChartTab'

interface UnifiedChartTabProps {
	selectedChartTab: ChartTabType
	selectedChain: string | null
	selectedProtocol: string | null
	selectedChartTypes: string[]
	chainOptions: Array<{ value: string; label: string }>
	protocolOptions: Array<{ value: string; label: string; logo?: string }>
	availableChartTypes: string[]
	chartTypesLoading: boolean
	protocolsLoading: boolean
	unifiedChartName: string
	chartCreationMode: 'separate' | 'combined'
	composerItems: ChartConfig[]
	onChartTabChange: (tab: ChartTabType) => void
	onChainChange: (option: any) => void
	onProtocolChange: (option: any) => void
	onChartTypesChange: (types: string[]) => void
	onUnifiedChartNameChange: (name: string) => void
	onChartCreationModeChange: (mode: 'separate' | 'combined') => void
	onComposerItemColorChange: (id: string, color: string) => void
	onAddToComposer: (typesToAdd?: string[]) => void
	onRemoveFromComposer: (id: string) => void
}

interface UnifiedChartTabPropsExtended extends UnifiedChartTabProps {
	selectedChains?: string[]
	selectedProtocols?: string[]
	selectedYieldPool?: { configID: string; name: string; project: string; chain: string } | null
	onSelectedChainsChange?: (values: string[]) => void
	onSelectedProtocolsChange?: (values: string[]) => void
	onSelectedYieldPoolChange?: (pool: { configID: string; name: string; project: string; chain: string } | null) => void
	selectedYieldChains?: string[]
	selectedYieldProjects?: string[]
	selectedYieldCategories?: string[]
	selectedYieldTokens?: string[]
	minTvl?: number | null
	maxTvl?: number | null
	onSelectedYieldChainsChange?: (chains: string[]) => void
	onSelectedYieldProjectsChange?: (projects: string[]) => void
	onSelectedYieldCategoriesChange?: (categories: string[]) => void
	onSelectedYieldTokensChange?: (tokens: string[]) => void
	onMinTvlChange?: (tvl: number | null) => void
	onMaxTvlChange?: (tvl: number | null) => void
}

export function UnifiedChartTab({
	selectedChartTab,
	selectedChain,
	selectedProtocol,
	selectedChartTypes,
	chainOptions,
	protocolOptions,
	availableChartTypes,
	chartTypesLoading,
	protocolsLoading,
	unifiedChartName,
	chartCreationMode,
	composerItems,
	onChartTabChange,
	onChainChange,
	onProtocolChange,
	onChartTypesChange,
	onUnifiedChartNameChange,
	onChartCreationModeChange,
	onComposerItemColorChange,
	onAddToComposer,
	onRemoveFromComposer,
	selectedChains = [],
	selectedProtocols = [],
	selectedYieldPool = null,
	onSelectedChainsChange,
	onSelectedProtocolsChange,
	onSelectedYieldPoolChange,
	selectedYieldChains = [],
	selectedYieldProjects = [],
	selectedYieldCategories = [],
	selectedYieldTokens = [],
	minTvl = null,
	maxTvl = null,
	onSelectedYieldChainsChange,
	onSelectedYieldProjectsChange,
	onSelectedYieldCategoriesChange,
	onSelectedYieldTokensChange,
	onMinTvlChange,
	onMaxTvlChange
}: UnifiedChartTabPropsExtended) {
	const protocolChartTypes = useMemo(() => getProtocolChartTypes(), [])
	const chainChartTypes = useMemo(() => getChainChartTypes(), [])
	const { loading: metaLoading, availableProtocolChartTypes, availableChainChartTypes } = useAppMetadata()
	const { protocols, chains } = useProDashboard()

	const handleChartTypesChange = (types: string[]) => {
		onChartTypesChange(types)
	}

	const handleAddToSelection = () => {
		if (selectedChartTypes.length > 0) {
			onAddToComposer(selectedChartTypes)
			onChartTypesChange([])
			onSelectedChainsChange?.([])
			onSelectedProtocolsChange?.([])
		}
	}

	const instantAvailableChartTypes = useMemo(() => {
		let available: string[] = []
		if (selectedChartTab === 'protocol' && selectedProtocol) {
			const geckoId = protocols.find((p: any) => p.slug === selectedProtocol)?.geckoId
			available = availableProtocolChartTypes(selectedProtocol, { hasGeckoId: !!geckoId })
		} else if (selectedChartTab === 'chain' && selectedChain) {
			const geckoId = chains.find((c: any) => c.name === selectedChain)?.gecko_id
			available = availableChainChartTypes(selectedChain, { hasGeckoId: !!geckoId })
		}

		if (!available || available.length === 0) {
			return []
		}

		const order = selectedChartTab === 'protocol' ? protocolChartTypes : chainChartTypes
		const availableSet = new Set(available)
		return order.filter((type) => availableSet.has(type))
	}, [
		selectedChartTab,
		selectedProtocol,
		selectedChain,
		protocols,
		chains,
		availableProtocolChartTypes,
		availableChainChartTypes,
		protocolChartTypes,
		chainChartTypes
	])

	const globalAvailableChartTypes = useMemo(() => {
		const set = new Set<string>()
		for (const c of chains) {
			const geckoId = (c as any).gecko_id
			for (const t of availableChainChartTypes(c.name, { hasGeckoId: !!geckoId })) set.add(t)
		}
		for (const p of protocols) {
			if (!p.slug) continue
			const geckoId = (p as any).geckoId
			for (const t of availableProtocolChartTypes(p.slug, { hasGeckoId: !!geckoId })) set.add(t)
		}
		return Array.from(set)
	}, [chains, protocols, availableChainChartTypes, availableProtocolChartTypes])

	const selectedChartTypeSingle = useMemo(() => selectedChartTypes[0] || null, [selectedChartTypes])

	const chartTypeOptions = useMemo(() => {
		const availableTypes =
			instantAvailableChartTypes.length > 0 ? instantAvailableChartTypes : globalAvailableChartTypes
		const chartTypesOrder = selectedChartTab === 'chain' ? chainChartTypes : protocolChartTypes
		return chartTypesOrder
			.filter((type) => availableTypes.includes(type))
			.map((type) => ({
				value: type,
				label: CHART_TYPES[type as keyof typeof CHART_TYPES]?.title || type
			}))
	}, [instantAvailableChartTypes, globalAvailableChartTypes, selectedChartTab, chainChartTypes, protocolChartTypes])

	if (selectedChartTab === 'yields') {
		return (
			<YieldsChartTab
				selectedYieldPool={selectedYieldPool}
				onSelectedYieldPoolChange={onSelectedYieldPoolChange || (() => {})}
				onChartTabChange={onChartTabChange}
				selectedYieldChains={selectedYieldChains}
				selectedYieldProjects={selectedYieldProjects}
				selectedYieldCategories={selectedYieldCategories}
				selectedYieldTokens={selectedYieldTokens}
				minTvl={minTvl}
				maxTvl={maxTvl}
				onSelectedYieldChainsChange={onSelectedYieldChainsChange || (() => {})}
				onSelectedYieldProjectsChange={onSelectedYieldProjectsChange || (() => {})}
				onSelectedYieldCategoriesChange={onSelectedYieldCategoriesChange || (() => {})}
				onSelectedYieldTokensChange={onSelectedYieldTokensChange || (() => {})}
				onMinTvlChange={onMinTvlChange || (() => {})}
				onMaxTvlChange={onMaxTvlChange || (() => {})}
			/>
		)
	}

	return (
		<div className="flex h-full min-h-[400px] gap-3 overflow-hidden">
			<div className="pro-border flex w-[380px] flex-col border lg:w-[420px]">
				<div className="flex h-full flex-col p-3">
					<div className="mb-3 rounded-lg border border-(--cards-border) bg-(--cards-bg-alt)/60 p-1">
						<div className="grid grid-cols-2 gap-1">
							<button
								type="button"
								className="group rounded-md bg-(--primary)/10 px-3 py-2.5 text-xs font-semibold text-(--primary) shadow-sm transition-all"
							>
								<div className="flex items-center justify-center gap-2">
									<Icon name="bar-chart-2" width={14} height={14} className="text-(--primary)" />
									<span>Protocols/Chains</span>
								</div>
							</button>
							<button
								type="button"
								onClick={() => onChartTabChange('yields')}
								className="group rounded-md px-3 py-2.5 text-xs font-semibold text-(--text-secondary) transition-all hover:bg-(--cards-bg) hover:text-(--text-primary)"
							>
								<div className="flex items-center justify-center gap-2">
									<Icon
										name="percent"
										width={14}
										height={14}
										className="text-(--text-tertiary) transition-colors group-hover:text-(--text-secondary)"
									/>
									<span>Yields</span>
								</div>
							</button>
						</div>
					</div>
					{chartCreationMode === 'combined' && (
						<div className="mb-2 flex-shrink-0">
							<label className="pro-text2 mb-1 block text-xs font-medium">Chart Name</label>
							<input
								type="text"
								value={unifiedChartName}
								onChange={(e) => onUnifiedChartNameChange(e.target.value)}
								placeholder="Enter chart name..."
								className="pro-text1 placeholder:pro-text3 w-full rounded-md border border-(--form-control-border) bg-(--bg-input) px-2 py-1 text-xs focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
							/>
						</div>
					)}

					<div className="mb-2 flex-shrink-0">
						<AriakitSelect
							label="Select Chart Type"
							options={chartTypeOptions}
							selectedValue={selectedChartTypeSingle}
							onChange={(option) => onChartTypesChange([option.value])}
							placeholder="Select chart type..."
							isLoading={metaLoading}
						/>
					</div>

					<div className="mb-2">
						<SubjectMultiPanel
							activeTab={selectedChartTab}
							onTabChange={onChartTabChange}
							selectedChartType={selectedChartTypeSingle}
							chainOptions={chainOptions}
							protocolOptions={protocolOptions as any}
							selectedChains={selectedChains}
							onSelectedChainsChange={onSelectedChainsChange || (() => {})}
							selectedProtocols={selectedProtocols}
							onSelectedProtocolsChange={onSelectedProtocolsChange || (() => {})}
							isLoading={protocolsLoading}
						/>
					</div>

					<button
						onClick={handleAddToSelection}
						disabled={
							selectedChartTypes.length === 0 ||
							(selectedChartTab === 'chain' && selectedChains.length === 0) ||
							(selectedChartTab === 'protocol' && selectedProtocols.length === 0)
						}
						className={`mb-2 w-full flex-shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${
							selectedChartTypes.length === 0 ||
							(selectedChartTab === 'chain' && selectedChains.length === 0) ||
							(selectedChartTab === 'protocol' && selectedProtocols.length === 0)
								? 'pro-border pro-text3 cursor-not-allowed border opacity-50'
								: 'pro-btn-blue'
						}`}
					>
						Add to Selection{' '}
						{selectedChartTypes.length > 0 &&
							`(${selectedChartTypes.length} chart${selectedChartTypes.length > 1 ? 's' : ''})`}
					</button>

					<div className="pro-border flex-shrink-0 border-t pt-2">
						<Switch
							label="Combined Chart"
							checked={chartCreationMode === 'combined'}
							onChange={() => onChartCreationModeChange(chartCreationMode === 'combined' ? 'separate' : 'combined')}
							value="combined"
							help={
								chartCreationMode === 'combined'
									? `Create 1 multi-chart with ${composerItems.length} chart${composerItems.length !== 1 ? 's' : ''}`
									: `Create ${composerItems.length} separate chart${composerItems.length !== 1 ? 's' : ''}`
							}
							className="text-xs"
						/>
					</div>
				</div>
			</div>

			<div className="pro-border flex flex-1 flex-col overflow-hidden border">
				<div className="pro-text2 flex-shrink-0 px-3 py-2 text-xs font-medium">Preview</div>

				{composerItems.length > 0 ? (
					<div className="min-h-0 flex-1 overflow-hidden rounded-md bg-(--cards-bg) p-2">
						<div className="h-full w-full" key={`${composerItems.map((i) => i.id).join(',')}`}>
							{chartCreationMode === 'combined' ? (
								<CombinedChartPreview composerItems={composerItems} />
							) : (
								<ComposerItemsCarousel composerItems={composerItems} />
							)}
						</div>
					</div>
				) : (
					<div className="pro-text3 flex flex-1 items-center justify-center text-center">
						<div>
							<Icon name="bar-chart-2" height={32} width={32} className="mx-auto mb-1" />
							<div className="text-xs">Select charts to see preview</div>
							<div className="pro-text3 mt-1 text-xs">
								Choose a {selectedChartTab} and chart types to generate preview
							</div>
						</div>
					</div>
				)}

				{composerItems.length > 0 && (
					<div className="flex-shrink-0 border-t border-(--cards-border) px-2 py-2">
						<div className="thin-scrollbar flex items-center gap-2 overflow-x-auto">
							<span className="pro-text2 shrink-0 text-xs font-medium">
								{chartCreationMode === 'combined' ? 'Charts in Multi-Chart:' : 'Charts to Create:'}
							</span>
							{composerItems.map((item) => (
								<div
									key={item.id}
									className="flex shrink-0 items-center gap-1.5 rounded-md border border-(--cards-border) bg-(--cards-bg) px-2 py-1 text-xs"
								>
									<span className="pro-text1">
										{item.protocol || item.chain} - {CHART_TYPES[item.type]?.title || item.type}
									</span>
									<input
										type="color"
										value={item.color || CHART_TYPES[item.type]?.color || '#3366ff'}
										onChange={(e) => onComposerItemColorChange(item.id, e.target.value)}
										className="h-5 w-5 cursor-pointer rounded border border-(--cards-border) bg-transparent p-0"
										aria-label="Select chart color"
									/>
									<button
										onClick={() => onRemoveFromComposer(item.id)}
										className="pro-text3 transition-colors hover:text-red-500"
										title="Remove from selection"
									>
										<Icon name="x" height={12} width={12} />
									</button>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
