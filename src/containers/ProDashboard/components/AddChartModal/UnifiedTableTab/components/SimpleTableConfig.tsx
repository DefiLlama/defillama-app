import { useMemo, useState } from 'react'
import type { CexAnalyticsMetric, CexAnalyticsView, ProtocolsTableConfig } from '~/containers/ProDashboard/types'
import { useAuthContext } from '~/containers/Subscription/auth'
import { getItemIconUrl } from '../../../../utils'
import { AriakitSelect } from '../../../AriakitSelect'
import { AriakitVirtualizedMultiSelect } from '../../../AriakitVirtualizedMultiSelect'
import { AriakitVirtualizedSelect } from '../../../AriakitVirtualizedSelect'
import { CexAnalyticsDataset } from '../../../datasets/CexAnalyticsDataset'
import { useTokenSearch } from '../../../datasets/TokenUsageDataset/useTokenSearch'
import type { CombinedTableType } from '../../types'

interface SimpleTableConfigProps {
	selectedChains: string[]
	chainOptions: Array<{ value: string; label: string }>
	protocolsLoading: boolean
	onChainsChange: (values: string[]) => void
	selectedDatasetChain: string | null
	onDatasetChainChange: (value: string | null) => void
	selectedDatasetTimeframe: string | null
	onDatasetTimeframeChange: (timeframe: string) => void
	selectedCexAnalyticsView: 'starter' | CexAnalyticsView
	onCexAnalyticsViewChange: (view: 'starter' | CexAnalyticsView) => void
	selectedCexAnalyticsMetric: CexAnalyticsMetric
	onCexAnalyticsMetricChange: (metric: CexAnalyticsMetric) => void
	selectedCexAnalyticsTopN: number
	onCexAnalyticsTopNChange: (topN: number) => void
	selectedTableType: CombinedTableType
	onTableTypeChange: (type: CombinedTableType) => void
	selectedTokens: string[]
	onTokensChange: (tokens: string[]) => void
	includeCex: boolean
	onIncludeCexChange: (include: boolean) => void
	legacyTableTypes?: CombinedTableType[]
	onBackToTypeSelector: () => void
	isEditing?: boolean
}

const tableTypeOptions: Array<{
	value: CombinedTableType
	label: string
	description: string
	icon: string
	hidden?: boolean
}> = [
	{
		value: 'yields',
		label: 'Yields',
		description: 'DeFi yield opportunities with APY, TVL, and IL data',
		icon: '🌾'
	},
	{
		value: 'cex-analytics',
		label: 'CEXs',
		description: 'Spot volume, derivatives volume, open interest, leverage, and CEX efficiency',
		icon: '📊'
	},
	{
		value: 'chains',
		label: 'Chains',
		description: 'Blockchain metrics including TVL, users, volume, and fees',
		icon: '⛓️'
	},
	{
		value: 'stablecoins',
		label: 'Stablecoins',
		description: 'Stablecoin market caps, price stability, and chains',
		icon: '💵'
	},
	{
		value: 'fees',
		label: 'Fees',
		description: 'Protocol fees generated across timeframes',
		icon: '💸',
		hidden: true
	},
	{
		value: 'revenue',
		label: 'Revenue',
		description: 'Protocol revenue generation across timeframes',
		icon: '💰',
		hidden: true
	},
	{
		value: 'holders-revenue',
		label: 'Holders Revenue',
		description: 'Revenue distributed to token holders',
		icon: '👥',
		hidden: true
	},
	{
		value: 'earnings',
		label: 'Earnings',
		description: 'Protocol profitability and earnings data',
		icon: '📈',
		hidden: true
	},
	{
		value: 'token-usage',
		label: 'Token Usage',
		description: 'Track protocol adoption by token usage',
		icon: '🪙'
	},
	{
		value: 'aggregators',
		label: 'DEX Aggregators',
		description: 'Aggregator trading volume and market dominance',
		icon: '🔄',
		hidden: true
	},
	{
		value: 'perps',
		label: 'Perpetuals',
		description: 'Perpetual futures trading volume and trends',
		icon: '📉',
		hidden: true
	},
	{
		value: 'options',
		label: 'Options',
		description: 'Options trading volume across protocols',
		icon: '⚡',
		hidden: true
	},
	{
		value: 'dexs',
		label: 'DEXs',
		description: 'Decentralized exchange volume and market share',
		icon: '💱',
		hidden: true
	},
	{
		value: 'bridge-aggregators',
		label: 'Bridge Aggregators',
		description: 'Cross-chain bridge aggregator volume and metrics',
		icon: '🌉',
		hidden: true
	},
	{
		value: 'trending-contracts',
		label: 'Trending Contracts',
		description: 'Most active smart contracts by transactions and gas usage',
		icon: '🔥'
	},
	{
		value: 'rwa',
		label: 'RWA Assets',
		description: 'Real World Assets with active mcap, onchain mcap, and DeFi TVL',
		icon: '🏛️'
	},
	{
		value: 'rwa-chains',
		label: 'RWA By Chain',
		description: 'RWA metrics aggregated by chain',
		icon: '🏛️'
	},
	{
		value: 'rwa-selected-chain',
		label: 'RWA On Chain',
		description: 'RWA assets on a selected chain',
		icon: '🏛️'
	}
]

const TRENDING_TIME_PERIOD_OPTIONS = [
	{ value: '1d', label: '1 Day' },
	{ value: '7d', label: '7 Days' },
	{ value: '30d', label: '30 Days' }
]

const CEX_ANALYTICS_VIEW_OPTIONS = [
	{ value: 'starter', label: 'Starter Preset' },
	{ value: 'summary', label: 'Summary Cards' },
	{ value: 'comparison', label: 'Comparison Table' },
	{ value: 'spot-vs-derivatives', label: 'Spot vs Derivatives Chart' },
	{ value: 'market-share', label: 'Market Share Chart' }
] as const

const CEX_ANALYTICS_VIEW_OPTIONS_EDIT = CEX_ANALYTICS_VIEW_OPTIONS.filter((option) => option.value !== 'starter')

const CEX_ANALYTICS_METRIC_OPTIONS = [
	{ value: 'spot', label: 'Spot Volume' },
	{ value: 'derivatives', label: 'Derivatives Volume' }
] as const

const CEX_ANALYTICS_TOP_N_OPTIONS = [
	{ value: '5', label: 'Top 5' },
	{ value: '8', label: 'Top 8' },
	{ value: '10', label: 'Top 10' },
	{ value: '12', label: 'Top 12' }
] as const

function CexAnalyticsPreview({
	view,
	metric,
	topN
}: {
	view: 'starter' | CexAnalyticsView
	metric: CexAnalyticsMetric
	topN: number
}) {
	const previewItems = useMemo<ProtocolsTableConfig[]>(() => {
		const createConfig = (previewView: CexAnalyticsView, idSuffix: string): ProtocolsTableConfig => ({
			id: `cex-preview-${idSuffix}`,
			kind: 'table',
			tableType: 'dataset',
			datasetType: 'cex-analytics',
			chains: [],
			cexAnalyticsView: previewView,
			cexAnalyticsMetric: metric,
			cexAnalyticsTopN: topN
		})

		if (view === 'starter') {
			return [
				createConfig('summary', 'summary'),
				createConfig('comparison', 'comparison'),
				createConfig('spot-vs-derivatives', 'spot-vs-derivatives')
			]
		}

		return [createConfig(view, view)]
	}, [metric, topN, view])

	return (
		<div className="flex flex-col gap-3">
			<div className={`grid gap-4 ${view === 'starter' ? 'xl:grid-cols-2' : 'grid-cols-1'}`}>
				{previewItems.map((config) => {
					const isSummary = config.cexAnalyticsView === 'summary'
					const heightClass = isSummary ? 'max-h-[240px]' : 'max-h-[420px]'

					return (
						<div
							key={config.id}
							className={`${view === 'starter' && isSummary ? 'xl:col-span-2' : ''} overflow-hidden rounded-xl border border-(--cards-border) bg-(--cards-bg-alt)`}
						>
							<div className={`${heightClass} overflow-auto`}>
								<CexAnalyticsDataset config={config} />
							</div>
						</div>
					)
				})}
			</div>
		</div>
	)
}

const EMPTY_LEGACY_TABLE_TYPES: CombinedTableType[] = []
const EMPTY_TOKEN_OPTIONS: Array<{ value: string; label: string; logo?: string }> = []
const CHAIN_CATEGORY_OPTIONS = [
	{ value: 'All', label: 'All Chains' },
	{ value: 'EVM', label: 'EVM Chains' },
	{ value: 'non-EVM', label: 'Non-EVM Chains' },
	{ value: 'Layer 2', label: 'Layer 2' },
	{ value: 'Rollup', label: 'Rollups' },
	{ value: 'Parachain', label: 'Parachains' },
	{ value: 'Cosmos', label: 'Cosmos' }
]
const PRO_ONLY_TABLE_TYPES = new Set<string>(['token-usage', 'rwa', 'rwa-chains', 'rwa-selected-chain'])

export function SimpleTableConfig({
	selectedChains,
	chainOptions,
	protocolsLoading,
	onChainsChange,
	selectedDatasetChain,
	onDatasetChainChange,
	selectedDatasetTimeframe,
	onDatasetTimeframeChange,
	selectedCexAnalyticsView,
	onCexAnalyticsViewChange,
	selectedCexAnalyticsMetric,
	onCexAnalyticsMetricChange,
	selectedCexAnalyticsTopN,
	onCexAnalyticsTopNChange,
	selectedTableType,
	onTableTypeChange,
	selectedTokens,
	onTokensChange,
	includeCex,
	onIncludeCexChange,
	legacyTableTypes = EMPTY_LEGACY_TABLE_TYPES,
	onBackToTypeSelector,
	isEditing = false
}: SimpleTableConfigProps) {
	const { hasActiveSubscription } = useAuthContext()
	const [tokenSearchInput, setTokenSearchInput] = useState('')
	const { data: tokenOptionsData, isLoading: isLoadingTokens } = useTokenSearch(tokenSearchInput)
	const { data: defaultTokensData } = useTokenSearch('')
	const tokenOptions = tokenOptionsData ?? EMPTY_TOKEN_OPTIONS
	const defaultTokens = defaultTokensData ?? EMPTY_TOKEN_OPTIONS

	const mergedTokenOptions = useMemo(() => {
		const baseOptions = tokenSearchInput ? tokenOptions : defaultTokens

		if (!selectedTokens || selectedTokens.length === 0) {
			return baseOptions
		}

		const optionMap = new Map(baseOptions.map((opt) => [opt.value, opt]))

		const additionalOptions = selectedTokens
			.filter((token) => !optionMap.has(token))
			.map((token) => ({ value: token, label: token }))

		return [...additionalOptions, ...baseOptions]
	}, [tokenSearchInput, tokenOptions, defaultTokens, selectedTokens])

	const datasetSelectOptions = useMemo(() => {
		const legacySet = new Set(legacyTableTypes)
		return tableTypeOptions
			.filter((option) => !option.hidden || legacySet.has(option.value))
			.filter((option) => hasActiveSubscription || !PRO_ONLY_TABLE_TYPES.has(option.value))
			.map((option) => ({
				value: option.value,
				label: option.hidden ? `${option.label} (Legacy)` : option.label,
				icon: option.icon,
				description: option.description
			}))
	}, [legacyTableTypes, hasActiveSubscription])

	const trendingChainOptions = useMemo(
		() =>
			chainOptions.filter((opt) =>
				['Ethereum', 'Arbitrum', 'Polygon', 'Optimism', 'OP Mainnet', 'Base'].includes(opt.label)
			),
		[chainOptions]
	)

	const chainCategoryOptions = CHAIN_CATEGORY_OPTIONS

	const tokenOptionMap = useMemo(() => {
		const map = new Map<string, { value: string; label: string; logo?: string }>()
		for (const option of mergedTokenOptions) {
			map.set(option.value, option)
		}
		return map
	}, [mergedTokenOptions])

	return (
		<div className="flex flex-col gap-4">
			<button
				type="button"
				onClick={onBackToTypeSelector}
				className="flex items-center gap-1 text-sm pro-text2 transition-colors hover:pro-text1"
			>
				<span>←</span>
				<span>Back to table type selection</span>
			</button>

			<AriakitVirtualizedSelect
				label="Table Type"
				options={datasetSelectOptions}
				selectedValue={selectedTableType}
				onChange={(option) => onTableTypeChange(option.value as CombinedTableType)}
				placeholder="Select table type..."
			/>

			{selectedTableType === 'stablecoins' ? (
				<AriakitVirtualizedSelect
					label="Select Chain"
					options={chainOptions}
					selectedValue={selectedDatasetChain}
					onChange={(option) => onDatasetChainChange(option.value)}
					placeholder="Select chain..."
					isLoading={protocolsLoading}
					renderIcon={(option) => (option.value === 'All' ? null : getItemIconUrl('chain', null, option.value))}
				/>
			) : selectedTableType === 'revenue' ||
			  selectedTableType === 'holders-revenue' ||
			  selectedTableType === 'earnings' ||
			  selectedTableType === 'fees' ||
			  selectedTableType === 'yields' ||
			  selectedTableType === 'aggregators' ||
			  selectedTableType === 'perps' ||
			  selectedTableType === 'options' ||
			  selectedTableType === 'dexs' ||
			  selectedTableType === 'bridge-aggregators' ? (
				<AriakitVirtualizedMultiSelect
					label="Select Chains (optional)"
					options={chainOptions}
					selectedValues={selectedChains}
					onChange={onChainsChange}
					isLoading={protocolsLoading}
					placeholder="All chains..."
					renderIcon={(option) => (option.value === 'All' ? null : getItemIconUrl('chain', null, option.value))}
				/>
			) : selectedTableType === 'chains' ? (
				<AriakitSelect
					label="Select Category (optional)"
					options={chainCategoryOptions}
					selectedValue={selectedDatasetChain}
					onChange={(option) => onDatasetChainChange(option.value)}
					placeholder="All chains..."
				/>
			) : selectedTableType === 'trending-contracts' ? (
				<>
					<AriakitVirtualizedSelect
						label="Select Chain"
						options={trendingChainOptions}
						selectedValue={selectedDatasetChain}
						onChange={(option) => onDatasetChainChange(option.value)}
						placeholder="Select chain..."
						isLoading={protocolsLoading}
						renderIcon={(option) => (option.value === 'All' ? null : getItemIconUrl('chain', null, option.value))}
					/>
					<AriakitSelect
						label="Time Period"
						options={TRENDING_TIME_PERIOD_OPTIONS}
						selectedValue={selectedDatasetTimeframe}
						onChange={(option) => onDatasetTimeframeChange(option.value)}
						placeholder="Select time period..."
					/>
				</>
			) : selectedTableType === 'cex-analytics' ? (
				<>
					<AriakitSelect
						label="CEX View"
						options={isEditing ? [...CEX_ANALYTICS_VIEW_OPTIONS_EDIT] : [...CEX_ANALYTICS_VIEW_OPTIONS]}
						selectedValue={selectedCexAnalyticsView}
						onChange={(option) => onCexAnalyticsViewChange(option.value as 'starter' | CexAnalyticsView)}
						placeholder="Select CEX view..."
					/>
					{selectedCexAnalyticsView === 'market-share' ? (
						<>
							<AriakitSelect
								label="Share Metric"
								options={[...CEX_ANALYTICS_METRIC_OPTIONS]}
								selectedValue={selectedCexAnalyticsMetric}
								onChange={(option) => onCexAnalyticsMetricChange(option.value as CexAnalyticsMetric)}
								placeholder="Select metric..."
							/>
							<AriakitSelect
								label="Top CEXs"
								options={[...CEX_ANALYTICS_TOP_N_OPTIONS]}
								selectedValue={String(selectedCexAnalyticsTopN)}
								onChange={(option) => onCexAnalyticsTopNChange(Number(option.value))}
								placeholder="Select top N..."
							/>
						</>
					) : null}
					<div className="mt-1">
						<CexAnalyticsPreview
							view={selectedCexAnalyticsView}
							metric={selectedCexAnalyticsMetric}
							topN={selectedCexAnalyticsTopN}
						/>
					</div>
				</>
			) : selectedTableType === 'token-usage' ? (
				<>
					<AriakitVirtualizedMultiSelect
						label="Select Tokens (up to 4)"
						options={mergedTokenOptions}
						selectedValues={selectedTokens}
						onChange={(values) => onTokensChange(values.slice(0, 4))}
						isLoading={isLoadingTokens}
						placeholder={selectedTokens.length >= 4 ? 'Maximum 4 tokens selected' : 'Search tokens...'}
						maxSelections={4}
						onSearchChange={setTokenSearchInput}
						renderIcon={(option) => option.logo || null}
					/>
					{selectedTokens.length > 0 ? (
						<div className="mt-2 flex flex-wrap gap-2">
							{selectedTokens.map((token) => {
								const option = tokenOptionMap.get(token)
								return (
									<div key={token} className="inline-flex items-center gap-1.5 rounded-md bg-(--pro-bg3) px-2.5 py-1">
										{option?.logo ? (
											<img
												src={option.logo}
												alt=""
												width={16}
												height={16}
												className="h-4 w-4 rounded-full"
												onError={(e) => {
													e.currentTarget.style.display = 'none'
												}}
											/>
										) : (
											<div className="h-4 w-4 rounded-full bg-(--bg-tertiary)" />
										)}
										<span className="text-sm pro-text1">{option?.label ?? token}</span>
										<button
											type="button"
											onClick={() => onTokensChange(selectedTokens.filter((t) => t !== token))}
											className="ml-1 text-xs pro-text3 transition-colors hover:pro-text1"
											aria-label={`Remove ${option?.label ?? token}`}
										>
											✕
										</button>
									</div>
								)
							})}
						</div>
					) : null}
					<button
						type="button"
						className="flex w-full items-center gap-2 rounded-md border pro-border pro-hover-bg px-3 py-1.5 text-left pro-text2 transition-colors hover:pro-text1"
						onClick={() => onIncludeCexChange(!includeCex)}
					>
						<div className="relative h-4 w-4">
							<input type="checkbox" checked={includeCex} readOnly className="sr-only" />
							<div
								className={`h-4 w-4 border-2 transition-all ${
									includeCex
										? 'border-pro-blue-100 bg-pro-blue-100 dark:border-pro-blue-300/20 dark:bg-pro-blue-300/20'
										: 'pro-border bg-transparent'
								}`}
							>
								{includeCex ? (
									<svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
										<path
											fillRule="evenodd"
											d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
											clipRule="evenodd"
										/>
									</svg>
								) : null}
							</div>
						</div>
						<span className="text-sm font-medium pro-text2">Include CEXs</span>
					</button>
				</>
			) : selectedTableType === 'rwa-selected-chain' ? (
				<AriakitVirtualizedSelect
					label="Select Chain"
					options={chainOptions}
					selectedValue={selectedDatasetChain}
					onChange={(option) => onDatasetChainChange(option.value)}
					placeholder="Select chain..."
					isLoading={protocolsLoading}
					renderIcon={(option) => (option.value === 'All' ? null : getItemIconUrl('chain', null, option.value))}
				/>
			) : null}
		</div>
	)
}
