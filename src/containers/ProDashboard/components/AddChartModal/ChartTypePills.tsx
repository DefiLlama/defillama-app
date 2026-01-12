import { memo, useMemo } from 'react'
import * as Ariakit from '@ariakit/react'
import { LocalLoader } from '~/components/Loaders'
import { Icon } from '~/components/Icon'

interface ChartTypeOption {
	value: string
	label: string
	available?: boolean
}

interface ChartTypePillsProps {
	chartTypes: ChartTypeOption[]
	selectedType: string | null
	onSelect: (type: string) => void
	isLoading?: boolean
	mode?: 'chain' | 'protocol'
}

const PROTOCOL_GROUPS: Record<string, string[]> = {
	Value: ['tvl', 'treasury'],
	Volume: ['volume', 'aggregators', 'perps', 'perpsAggregators', 'bridgeAggregators'],
	'Fees & Revenue': ['fees', 'revenue', 'incentives', 'holdersRevenue', 'bribes', 'tokenTax'],
	Derivatives: ['openInterest', 'optionsPremium', 'optionsNotional'],
	Token: ['tokenMcap', 'tokenPrice', 'tokenVolume'],
	DeFi: ['medianApy', 'borrowed'],
	Ratios: ['pfRatio', 'psRatio']
}

const CHAIN_GROUPS: Record<string, string[]> = {
	Value: ['tvl', 'bridgedTvl'],
	Volume: ['volume', 'aggregators', 'perps', 'perpsAggregators', 'bridgeAggregators', 'options'],
	'Fees & Revenue': ['fees', 'revenue', 'chainFees', 'chainRevenue', 'bribes', 'tokenTax'],
	Activity: ['users', 'txs', 'activeUsers', 'newUsers', 'gasUsed'],
	Stablecoins: ['stablecoins', 'stablecoinInflows'],
	'Native Token': ['chainMcap', 'chainPrice']
}

export const ChartTypePills = memo(function ChartTypePills({
	chartTypes,
	selectedType,
	onSelect,
	isLoading = false,
	mode = 'protocol'
}: ChartTypePillsProps) {
	const chartTypeMap = useMemo(() => {
		const map = new Map<string, ChartTypeOption>()
		chartTypes.forEach((ct) => map.set(ct.value, ct))
		return map
	}, [chartTypes])

	const groups = mode === 'chain' ? CHAIN_GROUPS : PROTOCOL_GROUPS

	const groupedOptions = useMemo(() => {
		const result: Array<{ group: string; options: ChartTypeOption[] }> = []

		for (const [groupName, typeIds] of Object.entries(groups)) {
			const options: ChartTypeOption[] = []
			for (const id of typeIds) {
				const chartType = chartTypeMap.get(id)
				if (chartType) {
					options.push(chartType)
				}
			}
			if (options.length > 0) {
				result.push({ group: groupName, options })
			}
		}

		return result
	}, [groups, chartTypeMap])

	const selectedLabel = useMemo(() => {
		if (!selectedType) return 'Select Chart Type'
		const ct = chartTypeMap.get(selectedType)
		return ct?.label || selectedType
	}, [selectedType, chartTypeMap])

	if (isLoading) {
		return (
			<div className="flex h-10 items-center justify-center">
				<LocalLoader />
			</div>
		)
	}

	return (
		<Ariakit.SelectProvider
			value={selectedType || ''}
			setValue={(value) => {
				if (value && typeof value === 'string') {
					onSelect(value)
				}
			}}
		>
			<Ariakit.Select className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-(--cards-border) bg-(--cards-bg) px-3 py-2 text-xs text-(--text-primary) transition-colors hover:border-(--text-tertiary) focus:ring-1 focus:ring-(--primary) focus:outline-hidden">
				<span className={selectedType ? 'text-(--text-primary)' : 'text-(--text-tertiary)'}>{selectedLabel}</span>
				<Ariakit.SelectArrow />
			</Ariakit.Select>
			<Ariakit.SelectPopover
				gutter={4}
				sameWidth
				unmountOnHide
				className="z-50 max-h-[320px] overflow-auto overscroll-contain rounded-lg border border-(--cards-border) bg-(--bg-main) shadow-lg"
			>
				{groupedOptions.map(({ group, options }) => (
					<Ariakit.SelectGroup key={group} className="py-1">
						<Ariakit.SelectGroupLabel className="px-3 py-1.5 text-[10px] font-semibold tracking-wide text-(--text-tertiary) uppercase">
							{group}
						</Ariakit.SelectGroupLabel>
						{options.map((option) => {
							const isAvailable = option.available !== false
							const isSelected = selectedType === option.value

							return (
								<Ariakit.SelectItem
									key={option.value}
									value={option.value}
									disabled={!isAvailable}
									className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-1.5 text-xs transition-colors ${
										isAvailable
											? 'text-(--text-primary) hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) data-active-item:bg-(--primary-hover)'
											: 'cursor-not-allowed text-(--text-tertiary) opacity-50'
									}`}
								>
									<span>{option.label}</span>
									{isSelected && (
										<Icon name="check" height={14} width={14} className="text-(--old-blue)" />
									)}
								</Ariakit.SelectItem>
							)
						})}
					</Ariakit.SelectGroup>
				))}
			</Ariakit.SelectPopover>
		</Ariakit.SelectProvider>
	)
})
