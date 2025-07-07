import { MultiItemSelect } from '../MultiItemSelect'
import { ItemSelect } from '../ItemSelect'
import { SingleSelectWithTags } from '../SingleSelectWithTags'
import { CombinedTableType } from './types'
import { useTokenSearch } from '../datasets/TokenUsageDataset/useTokenSearch'
import { useState, useMemo } from 'react'
import { ReactSelect } from '~/components/MultiSelect/ReactSelect'
import { reactSelectStyles } from '../../utils/reactSelectStyles'

interface TableTabProps {
	selectedChains: string[]
	chainOptions: Array<{ value: string; label: string }>
	protocolsLoading: boolean
	onChainsChange: (options: any[]) => void
	selectedDatasetChain: string | null
	onDatasetChainChange: (option: any) => void
	selectedDatasetTimeframe: string | null
	onDatasetTimeframeChange: (timeframe: string) => void
	selectedTableType: CombinedTableType
	onTableTypeChange: (type: CombinedTableType) => void
	selectedTokens: string[]
	onTokensChange: (tokens: string[]) => void
	includeCex: boolean
	onIncludeCexChange: (include: boolean) => void
}

const tableTypeOptions = [
	{
		value: 'protocols',
		label: 'Protocols',
		description: 'Protocol TVL rankings and performance metrics',
		icon: '📊'
	},
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
		value: 'stablecoins',
		label: 'Stablecoins',
		description: 'Stablecoin market caps, price stability, and chains',
		icon: '💵'
	},
	{
		value: 'revenue',
		label: 'Revenue',
		description: 'Protocol revenue generation across timeframes',
		icon: '💰'
	},
	{
		value: 'holders-revenue',
		label: 'Holders Revenue',
		description: 'Revenue distributed to token holders',
		icon: '👥'
	},
	{
		value: 'earnings',
		label: 'Earnings',
		description: 'Protocol profitability and earnings data',
		icon: '📈'
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
		icon: '🔄'
	},
	{
		value: 'perps',
		label: 'Perpetuals',
		description: 'Perpetual futures trading volume and trends',
		icon: '📉'
	},
	{
		value: 'options',
		label: 'Options',
		description: 'Options trading volume across protocols',
		icon: '⚡'
	},
	{
		value: 'dexs',
		label: 'DEXs',
		description: 'Decentralized exchange volume and market share',
		icon: '💱'
	},
	{
		value: 'bridge-aggregators',
		label: 'Bridge Aggregators',
		description: 'Cross-chain bridge aggregator volume and metrics',
		icon: '🌉'
	},
	{
		value: 'trending-contracts',
		label: 'Trending Contracts',
		description: 'Most active smart contracts by transactions and gas usage',
		icon: '🔥'
	}
]

const DatasetOption = ({ innerProps, label, data, options, innerRef }) => {
	const isLast = options[options.length - 1].value === data.value
	return (
		<div
			ref={innerRef}
			{...innerProps}
			style={{
				padding: '8px 12px',
				cursor: 'pointer',
				borderBottom: isLast ? 'none' : '1px solid var(--divider)'
			}}
		>
			<div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
				<span style={{ fontSize: '16px', marginTop: '1px' }}>{data.icon}</span>
				<div style={{ flex: 1 }}>
					<div style={{ fontWeight: 500, marginBottom: '2px', color: 'var(--pro-text1)', fontSize: '14px' }}>
						{label}
					</div>
					<div style={{ fontSize: '12px', color: 'var(--pro-text2)', lineHeight: '1.3' }}>{data.description}</div>
				</div>
			</div>
		</div>
	)
}

const SingleValue = ({ children, data }) => (
	<div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '-2px' }}>
		<span style={{ fontSize: '16px' }}>{data.icon}</span>
		<span>{children}</span>
	</div>
)

export function TableTab({
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
	onIncludeCexChange
}: TableTabProps) {
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
	return (
		<div className="flex flex-col gap-4">
			<div>
				<label className="block mb-1.5 md:mb-2 text-sm font-medium pro-text2">Table Type</label>
				<ReactSelect
					options={tableTypeOptions}
					value={tableTypeOptions.find((option) => option.value === selectedTableType)}
					onChange={(option: any) => onTableTypeChange(option.value as CombinedTableType)}
					components={{
						Option: DatasetOption
					}}
					placeholder="Select table type..."
					className="w-full text-sm md:text-base"
					styles={{
						...reactSelectStyles,
						control: (provided: any, state: any) => ({
							...reactSelectStyles.control(provided, state),
							minHeight: '40px'
						}),
						menu: (provided: any) => ({
							...reactSelectStyles.menu(provided),
							padding: 0
						}),
						menuList: (provided: any) => ({
							...reactSelectStyles.menuList(provided),
							maxHeight: '320px',
							overflowY: 'auto',
							'&::-webkit-scrollbar': {
								width: '6px'
							},
							'&::-webkit-scrollbar-track': {
								background: 'var(--pro-bg2)'
							},
							'&::-webkit-scrollbar-thumb': {
								background: 'var(--pro-text3)',
								borderRadius: '3px'
							},
							'&::-webkit-scrollbar-thumb:hover': {
								background: 'var(--pro-text2)'
							}
						})
					}}
					menuPosition="fixed"
				/>
			</div>

			{selectedTableType === 'protocols' ? (
				<MultiItemSelect
					label="Select Chains"
					options={chainOptions}
					selectedValues={selectedChains}
					onChange={onChainsChange}
					isLoading={protocolsLoading}
					placeholder="Select chains..."
					itemType="chain"
				/>
			) : selectedTableType === 'stablecoins' ? (
				<ItemSelect
					label="Select Chain"
					options={chainOptions}
					selectedValue={selectedDatasetChain}
					onChange={onDatasetChainChange}
					isLoading={protocolsLoading}
					placeholder="Select chain..."
					itemType="chain"
				/>
			) : selectedTableType === 'revenue' ||
			  selectedTableType === 'holders-revenue' ||
			  selectedTableType === 'earnings' ||
			  selectedTableType === 'yields' ||
			  selectedTableType === 'aggregators' ||
			  selectedTableType === 'perps' ||
			  selectedTableType === 'options' ||
			  selectedTableType === 'dexs' ||
			  selectedTableType === 'bridge-aggregators' ? (
				<MultiItemSelect
					label="Select Chains (optional)"
					options={chainOptions}
					selectedValues={selectedChains}
					onChange={onChainsChange}
					isLoading={protocolsLoading}
					placeholder="All chains..."
					itemType="chain"
				/>
			) : selectedTableType === 'trending-contracts' ? (
				<>
					<ItemSelect
						label="Select Chain"
						options={chainOptions.filter(opt => 
							['Ethereum', 'Arbitrum', 'Polygon', 'Optimism', 'Base'].includes(opt.label)
						)}
						selectedValue={selectedDatasetChain}
						onChange={onDatasetChainChange}
						isLoading={protocolsLoading}
						placeholder="Select chain..."
						itemType="chain"
					/>
					<div>
						<label className="block mb-1.5 md:mb-2 text-sm font-medium pro-text2">Time Period</label>
						<ReactSelect
							options={[
								{ value: '1d', label: '1 Day' },
								{ value: '7d', label: '7 Days' },
								{ value: '30d', label: '30 Days' }
							]}
							value={selectedDatasetTimeframe ? { value: selectedDatasetTimeframe, label: selectedDatasetTimeframe === '1d' ? '1 Day' : selectedDatasetTimeframe === '7d' ? '7 Days' : '30 Days' } : null}
							onChange={(option: any) => onDatasetTimeframeChange(option?.value || '1d')}
							placeholder="Select time period..."
							className="w-full text-sm md:text-base"
							styles={reactSelectStyles}
						/>
					</div>
				</>
			) : selectedTableType === 'token-usage' ? (
				<>
					<SingleSelectWithTags
						label="Select Tokens (up to 4)"
						options={mergedTokenOptions}
						selectedValues={selectedTokens}
						onAddValue={(value) => {
							if (!selectedTokens.includes(value) && selectedTokens.length < 4) {
								onTokensChange([...selectedTokens, value])
							}
						}}
						onRemoveValue={(value) => {
							onTokensChange(selectedTokens.filter((token) => token !== value))
						}}
						isLoading={isLoadingTokens}
						placeholder="Search tokens..."
						itemType="token"
						onInputChange={setTokenSearchInput}
						maxSelections={4}
					/>
					<div
						className="flex items-center gap-2 px-3 py-1.5 border border-(--divider) hover:border-(--text3) transition-colors cursor-pointer"
						onClick={() => onIncludeCexChange(!includeCex)}
					>
						<div className="relative w-4 h-4">
							<input type="checkbox" checked={includeCex} readOnly className="sr-only" />
							<div
								className={`w-4 h-4 border-2 transition-all ${
									includeCex ? 'bg-(--primary1) border-(--primary1)' : 'bg-transparent border-(--text3)'
								}`}
							>
								{includeCex && (
									<svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
										<path
											fillRule="evenodd"
											d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
											clipRule="evenodd"
										/>
									</svg>
								)}
							</div>
						</div>
						<span className="text-sm font-medium pro-text2">Include CEXs</span>
					</div>
				</>
			) : null}
		</div>
	)
}
