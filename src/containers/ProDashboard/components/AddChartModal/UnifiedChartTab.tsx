import { memo, useMemo, useState } from 'react'
import { Icon } from '~/components/Icon'
import { useAppMetadata } from '../../AppMetadataContext'
import { useProDashboard } from '../../ProDashboardAPIContext'
import { CHART_TYPES, ChartConfig, getChainChartTypes, getProtocolChartTypes } from '../../types'
import { AriakitSelect } from '../AriakitSelect'
import { AdvancedTvlChartTab } from './AdvancedTvlChartTab'
import { CategoryCardsGrid } from './CategoryCardsGrid'
import { CategoryFormHeader } from './CategoryFormHeader'
import { CombinedChartPreview } from './CombinedChartPreview'
import { ComposerItemsCarousel } from './ComposerItemsCarousel'
import { SelectionFooter } from './SelectionFooter'
import { StablecoinsChartTab } from './StablecoinsChartTab'
import { SubjectMultiPanel } from './SubjectMultiPanel'
import { ChartTabType, ManualChartViewMode } from './types'
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
	selectedYieldChartType?: string
	onSelectedYieldChartTypeChange?: (chartType: string) => void
	selectedStablecoinChain?: string
	selectedStablecoinChartType?: string
	stablecoinMode?: 'chain' | 'asset'
	selectedStablecoinAsset?: string | null
	selectedStablecoinAssetId?: string | null
	selectedStablecoinAssetChartType?: string
	onSelectedStablecoinChainChange?: (chain: string) => void
	onSelectedStablecoinChartTypeChange?: (chartType: string) => void
	onStablecoinModeChange?: (mode: 'chain' | 'asset') => void
	onSelectedStablecoinAssetChange?: (asset: string | null) => void
	onSelectedStablecoinAssetIdChange?: (id: string | null) => void
	onSelectedStablecoinAssetChartTypeChange?: (chartType: string) => void
	selectedAdvancedTvlProtocol?: string | null
	selectedAdvancedTvlProtocolName?: string | null
	selectedAdvancedTvlChartType?: string
	onSelectedAdvancedTvlProtocolChange?: (protocol: string | null) => void
	onSelectedAdvancedTvlProtocolNameChange?: (name: string | null) => void
	onSelectedAdvancedTvlChartTypeChange?: (chartType: string) => void
}

export const UnifiedChartTab = memo(function UnifiedChartTab({
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
	onMaxTvlChange,
	selectedYieldChartType = 'tvl-apy',
	onSelectedYieldChartTypeChange,
	selectedStablecoinChain = 'All',
	selectedStablecoinChartType = 'totalMcap',
	stablecoinMode = 'chain',
	selectedStablecoinAsset = null,
	selectedStablecoinAssetId = null,
	selectedStablecoinAssetChartType = 'totalCirc',
	onSelectedStablecoinChainChange,
	onSelectedStablecoinChartTypeChange,
	onStablecoinModeChange,
	onSelectedStablecoinAssetChange,
	onSelectedStablecoinAssetIdChange,
	onSelectedStablecoinAssetChartTypeChange,
	selectedAdvancedTvlProtocol = null,
	selectedAdvancedTvlProtocolName = null,
	selectedAdvancedTvlChartType = 'tvl',
	onSelectedAdvancedTvlProtocolChange,
	onSelectedAdvancedTvlProtocolNameChange,
	onSelectedAdvancedTvlChartTypeChange
}: UnifiedChartTabPropsExtended) {
	const specialtyTabs = ['yields', 'stablecoins', 'advanced-tvl']
	const [viewMode, setViewMode] = useState<ManualChartViewMode>(() =>
		specialtyTabs.includes(selectedChartTab) || composerItems.length > 0 ? 'form' : 'cards'
	)

	const protocolChartTypes = useMemo(() => getProtocolChartTypes(), [])
	const chainChartTypes = useMemo(() => getChainChartTypes(), [])
	const { loading: metaLoading, availableProtocolChartTypes, availableChainChartTypes } = useAppMetadata()
	const { protocols, chains } = useProDashboard()

	const handleSelectCategory = (category: ChartTabType) => {
		onChartTabChange(category)
		setViewMode('form')
	}

	const handleBackToCards = () => {
		setViewMode('cards')
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

	if (viewMode === 'cards') {
		return (
			<div className="flex h-full flex-col">
				<div className="min-h-0 flex-1">
					<CategoryCardsGrid onSelectCategory={handleSelectCategory} />
				</div>
				<SelectionFooter
					composerItems={composerItems}
					chartCreationMode={chartCreationMode}
					unifiedChartName={unifiedChartName}
					onChartCreationModeChange={onChartCreationModeChange}
					onUnifiedChartNameChange={onUnifiedChartNameChange}
					onComposerItemColorChange={onComposerItemColorChange}
					onRemoveFromComposer={onRemoveFromComposer}
				/>
			</div>
		)
	}

	if (selectedChartTab === 'yields') {
		return (
			<div className="flex h-full flex-col">
				<CategoryFormHeader category={selectedChartTab} onBack={handleBackToCards} />
				<div className="min-h-0 flex-1">
					<YieldsChartTab
						selectedYieldPool={selectedYieldPool}
						onSelectedYieldPoolChange={onSelectedYieldPoolChange || (() => {})}
						selectedYieldChartType={selectedYieldChartType}
						onSelectedYieldChartTypeChange={onSelectedYieldChartTypeChange || (() => {})}
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
				</div>
				<SelectionFooter
					composerItems={composerItems}
					chartCreationMode={chartCreationMode}
					unifiedChartName={unifiedChartName}
					onChartCreationModeChange={onChartCreationModeChange}
					onUnifiedChartNameChange={onUnifiedChartNameChange}
					onComposerItemColorChange={onComposerItemColorChange}
					onRemoveFromComposer={onRemoveFromComposer}
				/>
			</div>
		)
	}

	if (selectedChartTab === 'stablecoins') {
		return (
			<div className="flex h-full flex-col">
				<CategoryFormHeader category={selectedChartTab} onBack={handleBackToCards} />
				<div className="min-h-0 flex-1">
					<StablecoinsChartTab
						selectedStablecoinChain={selectedStablecoinChain}
						selectedStablecoinChartType={selectedStablecoinChartType}
						stablecoinMode={stablecoinMode}
						selectedStablecoinAsset={selectedStablecoinAsset}
						selectedStablecoinAssetId={selectedStablecoinAssetId}
						selectedStablecoinAssetChartType={selectedStablecoinAssetChartType}
						onSelectedStablecoinChainChange={onSelectedStablecoinChainChange || (() => {})}
						onSelectedStablecoinChartTypeChange={onSelectedStablecoinChartTypeChange || (() => {})}
						onStablecoinModeChange={onStablecoinModeChange || (() => {})}
						onSelectedStablecoinAssetChange={onSelectedStablecoinAssetChange || (() => {})}
						onSelectedStablecoinAssetIdChange={onSelectedStablecoinAssetIdChange || (() => {})}
						onSelectedStablecoinAssetChartTypeChange={onSelectedStablecoinAssetChartTypeChange || (() => {})}
					/>
				</div>
				<SelectionFooter
					composerItems={composerItems}
					chartCreationMode={chartCreationMode}
					unifiedChartName={unifiedChartName}
					onChartCreationModeChange={onChartCreationModeChange}
					onUnifiedChartNameChange={onUnifiedChartNameChange}
					onComposerItemColorChange={onComposerItemColorChange}
					onRemoveFromComposer={onRemoveFromComposer}
				/>
			</div>
		)
	}

	if (selectedChartTab === 'advanced-tvl') {
		return (
			<div className="flex h-full flex-col">
				<CategoryFormHeader category={selectedChartTab} onBack={handleBackToCards} />
				<div className="min-h-0 flex-1">
					<AdvancedTvlChartTab
						selectedAdvancedTvlProtocol={selectedAdvancedTvlProtocol}
						selectedAdvancedTvlProtocolName={selectedAdvancedTvlProtocolName}
						selectedAdvancedTvlChartType={selectedAdvancedTvlChartType}
						onSelectedAdvancedTvlProtocolChange={onSelectedAdvancedTvlProtocolChange || (() => {})}
						onSelectedAdvancedTvlProtocolNameChange={onSelectedAdvancedTvlProtocolNameChange || (() => {})}
						onSelectedAdvancedTvlChartTypeChange={onSelectedAdvancedTvlChartTypeChange || (() => {})}
						protocolOptions={protocolOptions as any}
						protocolsLoading={protocolsLoading}
					/>
				</div>
				<SelectionFooter
					composerItems={composerItems}
					chartCreationMode={chartCreationMode}
					unifiedChartName={unifiedChartName}
					onChartCreationModeChange={onChartCreationModeChange}
					onUnifiedChartNameChange={onUnifiedChartNameChange}
					onComposerItemColorChange={onComposerItemColorChange}
					onRemoveFromComposer={onRemoveFromComposer}
				/>
			</div>
		)
	}

	return (
		<div className="flex h-full flex-col">
			<CategoryFormHeader category={selectedChartTab} onBack={handleBackToCards} />

			<div className="mb-3 rounded-lg border border-(--cards-border) bg-(--cards-bg-alt)/60 p-1">
				<div className="grid grid-cols-2 gap-1">
					<button
						type="button"
						onClick={() => onChartTabChange('chain')}
						className={`group rounded-md px-3 py-2.5 text-xs font-semibold transition-all ${
							selectedChartTab === 'chain'
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
									selectedChartTab === 'chain'
										? 'text-(--primary)'
										: 'text-(--text-tertiary) transition-colors group-hover:text-(--text-secondary)'
								}
							/>
							<span>Chains</span>
						</div>
					</button>
					<button
						type="button"
						onClick={() => onChartTabChange('protocol')}
						className={`group rounded-md px-3 py-2.5 text-xs font-semibold transition-all ${
							selectedChartTab === 'protocol'
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
									selectedChartTab === 'protocol'
										? 'text-(--primary)'
										: 'text-(--text-tertiary) transition-colors group-hover:text-(--text-secondary)'
								}
							/>
							<span>Protocols</span>
						</div>
					</button>
				</div>
			</div>

			<div className="min-h-0 flex-1">
				<div className="flex flex-col gap-4">
					<div className="space-y-3">
						<AriakitSelect
							label="Select Chart Type"
							options={chartTypeOptions}
							selectedValue={selectedChartTypeSingle}
							onChange={(option) => onChartTypesChange([option.value])}
							placeholder="Select chart type..."
							isLoading={metaLoading}
						/>

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
							hideTabToggle
						/>

						<button
							onClick={handleAddToSelection}
							disabled={
								selectedChartTypes.length === 0 ||
								(selectedChartTab === 'chain' && selectedChains.length === 0) ||
								(selectedChartTab === 'protocol' && selectedProtocols.length === 0)
							}
							className={`w-full rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 ${
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
					</div>

					<SelectionFooter
						composerItems={composerItems}
						chartCreationMode={chartCreationMode}
						unifiedChartName={unifiedChartName}
						onChartCreationModeChange={onChartCreationModeChange}
						onUnifiedChartNameChange={onUnifiedChartNameChange}
						onComposerItemColorChange={onComposerItemColorChange}
						onRemoveFromComposer={onRemoveFromComposer}
					/>

					<div className="pro-border overflow-hidden rounded-lg border">
						<div className="pro-text2 border-b border-(--cards-border) px-3 py-2 text-xs font-medium">Preview</div>

						{composerItems.length > 0 ? (
							<div className="h-[240px] bg-(--cards-bg)">
								<div className="h-full w-full" key={`${composerItems.map((i) => i.id).join(',')}`}>
									{chartCreationMode === 'combined' ? (
										<CombinedChartPreview composerItems={composerItems} />
									) : (
										<ComposerItemsCarousel composerItems={composerItems} />
									)}
								</div>
							</div>
						) : (
							<div className="pro-text3 flex h-[120px] items-center justify-center text-center">
								<div>
									<Icon name="bar-chart-2" height={32} width={32} className="mx-auto mb-1" />
									<div className="text-xs">Select charts to see preview</div>
									<div className="pro-text3 mt-1 text-xs">
										Choose a {selectedChartTab} and chart types to generate preview
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	)
})
