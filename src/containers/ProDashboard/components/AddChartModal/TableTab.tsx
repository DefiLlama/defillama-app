import { MultiItemSelect } from '../MultiItemSelect'
import { ItemSelect } from '../ItemSelect'
import { CombinedTableType } from './types'
import { ReactSelect } from '~/components/MultiSelect/ReactSelect'
import { useTokenSearch } from '../datasets/TokenUsageDataset/useTokenSearch'
import { useState } from 'react'
import { reactSelectStyles } from '../../utils/reactSelectStyles'

interface TableTabProps {
	selectedChains: string[]
	chainOptions: Array<{ value: string; label: string }>
	protocolsLoading: boolean
	onChainsChange: (options: any[]) => void
	selectedDatasetChain: string | null
	onDatasetChainChange: (option: any) => void
	selectedTableType: CombinedTableType
	onTableTypeChange: (type: CombinedTableType) => void
	selectedTokens: string[]
	onTokensChange: (options: any) => void
	includeCex: boolean
	onIncludeCexChange: (include: boolean) => void
}

const tableTypeOptions = [
	{ value: 'protocols', label: 'Protocols' },
	{ value: 'cex', label: 'CEX' },
	{ value: 'stablecoins', label: 'Stablecoins' },
	{ value: 'revenue', label: 'Revenue' },
	{ value: 'holders-revenue', label: 'Holders Revenue' },
	{ value: 'earnings', label: 'Earnings' },
	{ value: 'token-usage', label: 'Token Usage' }
]

interface TokenOption {
	value: string
	label: string
	logo?: string
}

const TokenOptionComponent: React.FC<any> = ({ innerProps, label, data }) => (
	<div {...innerProps} className="flex items-center gap-2 p-2 cursor-pointer">
		{data.logo ? (
			<img 
				src={data.logo} 
				alt="" 
				className="w-5 h-5 rounded-full" 
				onError={(e) => {
					e.currentTarget.style.display = 'none'
				}}
			/>
		) : (
			<div className="w-5 h-5 rounded-full bg-[var(--bg3)]" />
		)}
		<span>{label}</span>
	</div>
)

export function TableTab({
	selectedChains,
	chainOptions,
	protocolsLoading,
	onChainsChange,
	selectedDatasetChain,
	onDatasetChainChange,
	selectedTableType,
	onTableTypeChange,
	selectedTokens,
	onTokensChange,
	includeCex,
	onIncludeCexChange
}: TableTabProps) {
	const [tokenSearchInput, setTokenSearchInput] = useState('')
	const { data: tokenOptions = [], isLoading: isLoadingTokens } = useTokenSearch(tokenSearchInput)
	
	// Fetch default tokens on mount for token-usage type
	const { data: defaultTokens = [] } = useTokenSearch('')
	return (
		<div className="flex flex-col gap-4">
			<ItemSelect
				label="Table Type"
				options={tableTypeOptions}
				selectedValue={selectedTableType}
				onChange={(option) => onTableTypeChange(option.value as CombinedTableType)}
				placeholder="Select table type..."
				isLoading={false}
				itemType="text"
			/>

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
			) : (selectedTableType === 'revenue' || selectedTableType === 'holders-revenue' || selectedTableType === 'earnings') ? (
				<MultiItemSelect
					label="Select Chains (optional)"
					options={chainOptions}
					selectedValues={selectedChains}
					onChange={onChainsChange}
					isLoading={protocolsLoading}
					placeholder="All chains..."
					itemType="chain"
				/>
			) : selectedTableType === 'token-usage' ? (
				<>
					<div>
						<label className="block mb-2 text-sm font-medium pro-text2">Select Tokens (up to 4)</label>
						<ReactSelect
							placeholder="Search tokens..."
							value={selectedTokens.map(token => ({ label: token.toUpperCase(), value: token }))}
							onChange={onTokensChange}
							options={tokenSearchInput ? tokenOptions : defaultTokens}
							onInputChange={(value) => setTokenSearchInput(value)}
							isLoading={isLoadingTokens}
							isClearable
							isMulti
							components={{
								Option: TokenOptionComponent
							}}
							styles={reactSelectStyles}
						/>
					</div>
					<div className="flex items-center gap-2 px-3 py-1.5 border border-[var(--divider)] hover:border-[var(--text3)] transition-colors cursor-pointer"
					     onClick={() => onIncludeCexChange(!includeCex)}>
						<div className="relative w-4 h-4">
							<input
								type="checkbox"
								checked={includeCex}
								readOnly
								className="sr-only"
							/>
							<div className={`w-4 h-4 border-2 transition-all ${
								includeCex 
									? 'bg-[var(--primary1)] border-[var(--primary1)]' 
									: 'bg-transparent border-[var(--text3)]'
							}`}>
								{includeCex && (
									<svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
										<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
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
