import { memo, useCallback, useMemo, useState } from 'react'
import { Icon } from '~/components/Icon'
import { useAppMetadata } from '../../AppMetadataContext'
import { useProDashboardCatalog } from '../../ProDashboardAPIContext'
import { CHART_TYPES, ChartConfig, getChainChartTypes, getProtocolChartTypes } from '../../types'
import { AdvancedTvlChartTab } from './AdvancedTvlChartTab'
import { BorrowedChartTab } from './BorrowedChartTab'
import { CategoryCardsGrid } from './CategoryCardsGrid'
import { CategoryFormHeader } from './CategoryFormHeader'
import { ChartTypePills } from './ChartTypePills'
import { CombinedChartPreview } from './CombinedChartPreview'
import { EntityPickerList } from './EntityPickerList'
import { SelectionFooter } from './SelectionFooter'
import { StablecoinsChartTab } from './StablecoinsChartTab'
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
	onAddToComposer: (typesToAdd?: string[], options?: { entity?: string; mode?: 'chain' | 'protocol' }) => void
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
	selectedBorrowedProtocol?: string | null
	selectedBorrowedProtocolName?: string | null
	selectedBorrowedChartType?: string
	onSelectedBorrowedProtocolChange?: (protocol: string | null) => void
	onSelectedBorrowedProtocolNameChange?: (name: string | null) => void
	onSelectedBorrowedChartTypeChange?: (chartType: string) => void
}

export const UnifiedChartTab = memo(function UnifiedChartTab({
	selectedChartTab,
	selectedChain,
	selectedProtocol,
	selectedChartTypes,
	chainOptions,
	protocolOptions,
	availableChartTypes: _availableChartTypes,
	chartTypesLoading: _chartTypesLoading,
	protocolsLoading,
	unifiedChartName,
	chartCreationMode,
	composerItems,
	onChartTabChange,
	onChainChange: _onChainChange,
	onProtocolChange: _onProtocolChange,
	onChartTypesChange,
	onUnifiedChartNameChange,
	onChartCreationModeChange,
	onComposerItemColorChange,
	onAddToComposer,
	onRemoveFromComposer,
	selectedChains: _selectedChains = [],
	selectedProtocols: _selectedProtocols = [],
	selectedYieldPool = null,
	onSelectedChainsChange: _onSelectedChainsChange,
	onSelectedProtocolsChange: _onSelectedProtocolsChange,
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
	onSelectedAdvancedTvlChartTypeChange,
	selectedBorrowedProtocol = null,
	selectedBorrowedProtocolName = null,
	selectedBorrowedChartType = 'chainsBorrowed',
	onSelectedBorrowedProtocolChange,
	onSelectedBorrowedProtocolNameChange,
	onSelectedBorrowedChartTypeChange
}: UnifiedChartTabPropsExtended) {
	const specialtyTabs = ['yields', 'stablecoins', 'advanced-tvl', 'borrowed']
	const [viewMode, setViewMode] = useState<ManualChartViewMode>(() =>
		specialtyTabs.includes(selectedChartTab) || composerItems.length > 0 ? 'form' : 'cards'
	)

	const protocolChartTypes = useMemo(() => getProtocolChartTypes(), [])
	const chainChartTypes = useMemo(() => getChainChartTypes(), [])
	const { loading: metaLoading, availableProtocolChartTypes, availableChainChartTypes } = useAppMetadata()
	const { protocols, chains } = useProDashboardCatalog()

	const handleSelectCategory = (category: ChartTabType) => {
		onChartTabChange(category)
		setViewMode('form')
		if (category === 'chain' || category === 'protocol') {
			onChartTypesChange(['tvl'])
		}
	}

	const handleBackToCards = () => {
		setViewMode('cards')
	}

	const handleChainProtocolTabChange = (tab: 'chain' | 'protocol') => {
		onChartTabChange(tab)
		if (!selectedChartTypes.length || selectedChartTypes[0] !== 'tvl') {
			onChartTypesChange(['tvl'])
		}
	}

	const selectedChartTypeSingle = useMemo(() => selectedChartTypes[0] || null, [selectedChartTypes])

	const selectedEntitiesForCurrentType = useMemo(() => {
		if (!selectedChartTypeSingle) return []
		return composerItems
			.filter((item) => item.type === selectedChartTypeSingle)
			.map((item) => (selectedChartTab === 'chain' ? item.chain : item.protocol))
			.filter(Boolean) as string[]
	}, [composerItems, selectedChartTypeSingle, selectedChartTab])

	const handleEntityToggle = useCallback(
		(entityValue: string) => {
			if (!selectedChartTypeSingle) return

			const isSelected = selectedEntitiesForCurrentType.includes(entityValue)

			if (isSelected) {
				const itemToRemove = composerItems.find(
					(item) =>
						item.type === selectedChartTypeSingle &&
						(selectedChartTab === 'chain' ? item.chain === entityValue : item.protocol === entityValue)
				)
				if (itemToRemove) {
					onRemoveFromComposer(itemToRemove.id)
				}
			} else {
				onAddToComposer([selectedChartTypeSingle], {
					entity: entityValue,
					mode: selectedChartTab as 'chain' | 'protocol'
				})
			}
		},
		[
			selectedChartTypeSingle,
			selectedEntitiesForCurrentType,
			composerItems,
			selectedChartTab,
			onRemoveFromComposer,
			onAddToComposer
		]
	)

	const handleClearSelection = useCallback(() => {
		if (!selectedChartTypeSingle) return
		const itemsToRemove = composerItems.filter((item) => item.type === selectedChartTypeSingle)
		itemsToRemove.forEach((item) => onRemoveFromComposer(item.id))
	}, [selectedChartTypeSingle, composerItems, onRemoveFromComposer])

	const _instantAvailableChartTypes = useMemo(() => {
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

	const chartTypeOptions = useMemo(() => {
		const chartTypesOrder = selectedChartTab === 'chain' ? chainChartTypes : protocolChartTypes
		return chartTypesOrder.map((type) => ({
			value: type,
			label: CHART_TYPES[type as keyof typeof CHART_TYPES]?.title || type,
			available: globalAvailableChartTypes.includes(type)
		}))
	}, [globalAvailableChartTypes, selectedChartTab, chainChartTypes, protocolChartTypes])

	const filteredEntities = useMemo(() => {
		if (!selectedChartTypeSingle) {
			return selectedChartTab === 'chain' ? chainOptions : protocolOptions
		}

		if (selectedChartTab === 'chain') {
			return chainOptions.filter((chain) => {
				const geckoId = chains.find((c: any) => c.name === chain.value)?.gecko_id
				const available = availableChainChartTypes(chain.value, { hasGeckoId: !!geckoId })
				return available.includes(selectedChartTypeSingle)
			})
		} else {
			return protocolOptions.filter((protocol) => {
				const geckoId = protocols.find((p: any) => p.slug === protocol.value)?.geckoId
				const available = availableProtocolChartTypes(protocol.value, { hasGeckoId: !!geckoId })
				return available.includes(selectedChartTypeSingle)
			})
		}
	}, [
		selectedChartTypeSingle,
		selectedChartTab,
		chainOptions,
		protocolOptions,
		chains,
		protocols,
		availableChainChartTypes,
		availableProtocolChartTypes
	])

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

	if (selectedChartTab === 'borrowed') {
		return (
			<div className="flex h-full flex-col">
				<CategoryFormHeader category={selectedChartTab} onBack={handleBackToCards} />
				<div className="min-h-0 flex-1">
					<BorrowedChartTab
						selectedBorrowedProtocol={selectedBorrowedProtocol}
						selectedBorrowedProtocolName={selectedBorrowedProtocolName}
						selectedBorrowedChartType={selectedBorrowedChartType}
						onSelectedBorrowedProtocolChange={onSelectedBorrowedProtocolChange || (() => {})}
						onSelectedBorrowedProtocolNameChange={onSelectedBorrowedProtocolNameChange || (() => {})}
						onSelectedBorrowedChartTypeChange={onSelectedBorrowedChartTypeChange || (() => {})}
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
		<div className="flex h-full flex-col gap-3">
			<CategoryFormHeader category={selectedChartTab} onBack={handleBackToCards} />

			<div className="grid min-h-0 flex-1 grid-cols-2 gap-4">
				<div className="flex min-h-0 flex-col gap-3">
					<div className="shrink-0 rounded-xl border border-(--cards-border) bg-(--cards-bg-alt)/60 p-1 shadow-sm">
						<div className="grid grid-cols-2 gap-1">
							<button
								type="button"
								onClick={() => handleChainProtocolTabChange('chain')}
								className={`group flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all duration-200 ${
									selectedChartTab === 'chain'
										? 'bg-(--old-blue) text-white shadow-md ring-1 ring-black/10'
										: 'text-(--text-secondary) hover:bg-(--cards-bg)/80 hover:text-(--text-primary) hover:shadow-sm'
								}`}
							>
								<Icon
									name="chain"
									width={14}
									height={14}
									className={
										selectedChartTab === 'chain'
											? 'text-white'
											: 'text-(--text-tertiary) transition-colors group-hover:text-(--text-secondary)'
									}
								/>
								<span>Chains</span>
							</button>
							<button
								type="button"
								onClick={() => handleChainProtocolTabChange('protocol')}
								className={`group flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all duration-200 ${
									selectedChartTab === 'protocol'
										? 'bg-(--old-blue) text-white shadow-md ring-1 ring-black/10'
										: 'text-(--text-secondary) hover:bg-(--cards-bg)/80 hover:text-(--text-primary) hover:shadow-sm'
								}`}
							>
								<Icon
									name="protocol"
									width={14}
									height={14}
									className={
										selectedChartTab === 'protocol'
											? 'text-white'
											: 'text-(--text-tertiary) transition-colors group-hover:text-(--text-secondary)'
									}
								/>
								<span>Protocols</span>
							</button>
						</div>
					</div>

					<div className="shrink-0">
						<label className="pro-text2 mb-2 block text-xs font-medium">Select Chart Type</label>
						<ChartTypePills
							chartTypes={chartTypeOptions}
							selectedType={selectedChartTypeSingle}
							onSelect={(type) => onChartTypesChange([type])}
							isLoading={metaLoading}
							mode={selectedChartTab as 'chain' | 'protocol'}
						/>
					</div>

					<div className="min-h-0 flex-1">
						<EntityPickerList
							mode={selectedChartTab as 'chain' | 'protocol'}
							entities={filteredEntities}
							selectedEntities={selectedEntitiesForCurrentType}
							onToggle={handleEntityToggle}
							onClear={handleClearSelection}
							isLoading={protocolsLoading}
						/>
					</div>
				</div>

				<div className="flex min-h-0 flex-col gap-3">
					<input
						type="text"
						value={unifiedChartName}
						onChange={(e) => onUnifiedChartNameChange(e.target.value)}
						placeholder="Chart name..."
						className="pro-text1 placeholder:pro-text3 w-full shrink-0 rounded border border-(--form-control-border) bg-(--bg-input) px-2 py-1.5 text-xs focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
					/>

					<div className="h-[450px] shrink-0 overflow-hidden rounded-lg border border-(--cards-border) bg-(--cards-bg)">
						{composerItems.length > 0 ? (
							<CombinedChartPreview composerItems={composerItems} />
						) : (
							<div className="flex h-full items-center justify-center text-xs text-(--text-tertiary)">
								Select entities to preview chart
							</div>
						)}
					</div>

					{composerItems.length > 0 && (
						<div className="thin-scrollbar flex shrink-0 items-center gap-2 overflow-x-auto py-1">
							{composerItems.map((item) => (
								<div
									key={item.id}
									className="flex shrink-0 items-center gap-1.5 rounded-md border border-(--cards-border) bg-(--cards-bg) px-2 py-1 text-xs"
								>
									<input
										type="color"
										value={item.color || '#3366ff'}
										onChange={(e) => onComposerItemColorChange(item.id, e.target.value)}
										className="h-4 w-4 cursor-pointer rounded border-0 bg-transparent p-0"
									/>
									<span className="pro-text1 whitespace-nowrap">
										{item.protocol || item.chain} - {CHART_TYPES[item.type]?.title || item.type}
									</span>
									<button
										onClick={() => onRemoveFromComposer(item.id)}
										className="pro-text3 transition-colors hover:text-red-500"
									>
										<Icon name="x" height={12} width={12} />
									</button>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	)
})
