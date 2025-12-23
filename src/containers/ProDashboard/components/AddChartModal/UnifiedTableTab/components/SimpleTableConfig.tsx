import { memo, useMemo, useState } from 'react'
import { getItemIconUrl } from '../../../../utils'
import { AriakitSelect } from '../../../AriakitSelect'
import { AriakitVirtualizedMultiSelect } from '../../../AriakitVirtualizedMultiSelect'
import { AriakitVirtualizedSelect } from '../../../AriakitVirtualizedSelect'
import { useTokenSearch } from '../../../datasets/TokenUsageDataset/useTokenSearch'
import { CombinedTableType } from '../../types'

interface SimpleTableConfigProps {
	selectedChains: string[]
	chainOptions: Array<{ value: string; label: string }>
	protocolsLoading: boolean
	onChainsChange: (values: string[]) => void
	selectedDatasetChain: string | null
	onDatasetChainChange: (value: string | null) => void
	selectedDatasetTimeframe: string | null
	onDatasetTimeframeChange: (timeframe: string) => void
	selectedTableType: CombinedTableType
	onTableTypeChange: (type: CombinedTableType) => void
	selectedTokens: string[]
	onTokensChange: (tokens: string[]) => void
	includeCex: boolean
	onIncludeCexChange: (include: boolean) => void
	legacyTableTypes?: CombinedTableType[]
	onBackToTypeSelector: () => void
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
		value: 'cex',
		label: 'CEX',
		description: 'Centralized exchange assets, flows, and trading metrics',
		icon: '🏦'
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
	}
]

export const SimpleTableConfig = memo(function SimpleTableConfig({
	selectedChains,
	chainOptions,
	protocolsLoading,
	onChainsChange,
	selectedDatasetChain,
	onDatasetChainChange,
	selectedDatasetTimeframe,
	onDatasetTimeframeChange,
	selectedTableType,
	onTableTypeChange,
	selectedTokens,
	onTokensChange,
	includeCex,
	onIncludeCexChange,
	legacyTableTypes = [],
	onBackToTypeSelector
}: SimpleTableConfigProps) {
	const [tokenSearchInput, setTokenSearchInput] = useState('')
	const { data: tokenOptions = [], isLoading: isLoadingTokens } = useTokenSearch(tokenSearchInput)

	const { data: defaultTokens = [] } = useTokenSearch('')

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
			.map((option) => ({
				value: option.value,
				label: option.hidden ? `${option.label} (Legacy)` : option.label,
				icon: option.icon,
				description: option.description
			}))
	}, [legacyTableTypes])

	const trendingChainOptions = useMemo(
		() =>
			chainOptions.filter((opt) =>
				['Ethereum', 'Arbitrum', 'Polygon', 'Optimism', 'OP Mainnet', 'Base'].includes(opt.label)
			),
		[chainOptions]
	)

	const chainCategoryOptions = useMemo(
		() => [
			{ value: 'All', label: 'All Chains' },
			{ value: 'EVM', label: 'EVM Chains' },
			{ value: 'non-EVM', label: 'Non-EVM Chains' },
			{ value: 'Layer 2', label: 'Layer 2' },
			{ value: 'Rollup', label: 'Rollups' },
			{ value: 'Parachain', label: 'Parachains' },
			{ value: 'Cosmos', label: 'Cosmos' }
		],
		[]
	)

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
				className="pro-text2 hover:pro-text1 flex items-center gap-1 text-sm transition-colors"
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
					renderIcon={(option) => getItemIconUrl('chain', null, option.value)}
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
					renderIcon={(option) => getItemIconUrl('chain', null, option.value)}
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
						renderIcon={(option) => getItemIconUrl('chain', null, option.value)}
					/>
					<AriakitSelect
						label="Time Period"
						options={[
							{ value: '1d', label: '1 Day' },
							{ value: '7d', label: '7 Days' },
							{ value: '30d', label: '30 Days' }
						]}
						selectedValue={selectedDatasetTimeframe}
						onChange={(option) => onDatasetTimeframeChange(option.value)}
						placeholder="Select time period..."
					/>
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
					{selectedTokens.length > 0 && (
						<div className="mt-2 flex flex-wrap gap-2">
							{selectedTokens.map((token) => {
								const option = tokenOptionMap.get(token)
								return (
									<div key={token} className="inline-flex items-center gap-1.5 rounded-md bg-(--pro-bg3) px-2.5 py-1">
										{option?.logo ? (
											<img
												src={option.logo}
												alt=""
												className="h-4 w-4 rounded-full"
												onError={(e) => {
													e.currentTarget.style.display = 'none'
												}}
											/>
										) : (
											<div className="h-4 w-4 rounded-full bg-(--bg-tertiary)" />
										)}
										<span className="pro-text1 text-sm">{option?.label ?? token}</span>
										<button
											type="button"
											onClick={() => onTokensChange(selectedTokens.filter((t) => t !== token))}
											className="pro-text3 hover:pro-text1 ml-1 text-xs transition-colors"
											aria-label={`Remove ${option?.label ?? token}`}
										>
											✕
										</button>
									</div>
								)
							})}
						</div>
					)}
					<div
						className="pro-border pro-text2 hover:pro-text1 pro-hover-bg flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 transition-colors"
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
								{includeCex && (
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
						<span className="pro-text2 text-sm font-medium">Include CEXs</span>
					</div>
				</>
			) : null}
		</div>
	)
})
