import { useRouter } from 'next/router'
import { STABLECOINS_SETTINGS } from '~/contexts/LocalStorage'
import { useMemo } from 'react'
import { Select } from '~/components/Select'

export const stablecoinPegTypeOptions = [
	{
		name: 'USD',
		key: STABLECOINS_SETTINGS.PEGGEDUSD,
		filterFn: (item) => item.pegType === 'peggedUSD',
		help: 'Show stablecoins pegged to USD'
	},
	{
		name: 'EUR',
		key: STABLECOINS_SETTINGS.PEGGEDEUR,
		filterFn: (item) => item.pegType === 'peggedEUR',
		help: 'Show stablecoins pegged to EUR'
	},
	{
		name: 'SGD',
		key: STABLECOINS_SETTINGS.PEGGEDSGD,
		filterFn: (item) => item.pegType === 'peggedSGD',
		help: 'Show stablecoins pegged to SGD'
	},
	{
		name: 'JPY',
		key: STABLECOINS_SETTINGS.PEGGEDJPY,
		filterFn: (item) => item.pegType === 'peggedJPY',
		help: 'Show stablecoins pegged to JPY'
	},
	{
		name: 'CNY',
		key: STABLECOINS_SETTINGS.PEGGEDCNY,
		filterFn: (item) => item.pegType === 'peggedCNY',
		help: 'Show stablecoins pegged to CNY'
	},
	{
		name: 'UAH',
		key: STABLECOINS_SETTINGS.PEGGEDUAH,
		filterFn: (item) => item.pegType === 'peggedUAH',
		help: 'Show stablecoins pegged to UAH'
	},
	{
		name: 'ARS',
		key: STABLECOINS_SETTINGS.PEGGEDARS,
		filterFn: (item) => item.pegType === 'peggedARS',
		help: 'Show stablecoins pegged to ARS'
	},
	{
		name: 'GBP',
		key: STABLECOINS_SETTINGS.PEGGEDGBP,
		filterFn: (item) => item.pegType === 'peggedGBP',
		help: 'Show stablecoins pegged to GBP'
	},
	{
		name: 'Variable',
		key: STABLECOINS_SETTINGS.PEGGEDVAR,
		filterFn: (item) => item.pegType === 'peggedVAR',
		help: 'Show stablecoins with a variable or floating peg'
	},
	{
		name: 'CAD',
		key: STABLECOINS_SETTINGS.PEGGEDCAD,
		filterFn: (item) => item.pegType === 'peggedCAD',
		help: 'Show stablecoins pegged to CAD'
	},
	{
		name: 'AUD',
		key: STABLECOINS_SETTINGS.PEGGEDAUD,
		filterFn: (item) => item.pegType === 'peggedAUD',
		help: 'Show stablecoins pegged to AUD'
	},
	{
		name: 'TRY',
		key: STABLECOINS_SETTINGS.PEGGEDTRY,
		filterFn: (item) => item.pegType === 'peggedTRY',
		help: 'Show stablecoins pegged to Turkish Lira'
	},
	{
		name: 'CHF',
		key: STABLECOINS_SETTINGS.PEGGEDCHF,
		filterFn: (item) => item.pegType === 'peggedCHF',
		help: 'Show stablecoins pegged to Swiss Franc'
	},
	{
		name: 'COP',
		key: STABLECOINS_SETTINGS.PEGGEDCOP,
		filterFn: (item) => item.pegType === 'peggedCOP',
		help: 'Show stablecoins pegged to Colombian Peso'
	},
	{
		name: 'REAL',
		key: STABLECOINS_SETTINGS.PEGGEDREAL,
		filterFn: (item) => item.pegType === 'peggedREAL',
		help: 'Show stablecoins pegged to Brazilian Real'
	},
	{
		name: 'RUB',
		key: STABLECOINS_SETTINGS.PEGGEDRUB,
		filterFn: (item) => item.pegType === 'peggedRUB',
		help: 'Show stablecoins pegged to Russian Ruble'
	}
]

export function PegType({ pathname, nestedMenu }: { pathname: string; nestedMenu: boolean }) {
	const router = useRouter()

	const { pegtype = [], chain, ...queries } = router.query

	const selectedValues = useMemo(() => {
		return stablecoinPegTypeOptions
			.filter((o) => {
				if (pegtype) {
					if (pegtype.length === 0) {
						return true
					} else if (typeof pegtype === 'string') {
						return o.key === pegtype
					} else {
						return pegtype.includes(o.key)
					}
				}
			})
			.map((o) => o.key)
	}, [pegtype])

	const setSelectedValues = (newFilters) => {
		if (selectedValues.length === 1 && newFilters.length === 0) {
			router.push(
				{
					pathname,
					query: {
						...queries,
						pegtype: 'None'
					}
				},
				undefined,
				{ shallow: true }
			)
		} else {
			router.push(
				{
					pathname,
					query: {
						...queries,
						pegtype: newFilters
					}
				},
				undefined,
				{ shallow: true }
			)
		}
	}

	const toggleAll = () => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					pegtype: stablecoinPegTypeOptions.map((o) => o.key)
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const clearAll = () => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					pegtype: 'None'
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	return (
		<Select
			allValues={stablecoinPegTypeOptions}
			selectedValues={selectedValues}
			setSelectedValues={setSelectedValues}
			selectOnlyOne={(newOption) => {
				setSelectedValues([newOption])
			}}
			label="Peg Type"
			clearAll={clearAll}
			toggleAll={toggleAll}
			nestedMenu={nestedMenu}
			labelType="smol"
			triggerProps={{
				className:
					'flex items-center justify-between gap-2 px-2 py-[6px] text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium w-full sm:w-auto'
			}}
		/>
	)
}
