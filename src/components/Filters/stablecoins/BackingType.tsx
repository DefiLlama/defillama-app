import { useRouter } from 'next/router'
import { STABLECOINS_SETTINGS } from '~/contexts/LocalStorage'
import { useMemo } from 'react'
import { Select } from '~/components/Select'

export const stablecoinBackingOptions = [
	{
		name: 'Fiat',
		key: STABLECOINS_SETTINGS.FIATSTABLES,
		filterFn: (item) => item.pegMechanism === 'fiat-backed',
		help: 'Show stablecoins backed by fiat'
	},
	{
		name: 'Crypto',
		key: STABLECOINS_SETTINGS.CRYPTOSTABLES,
		filterFn: (item) => item.pegMechanism === 'crypto-backed',
		help: 'Show stablecoins backed by crypto'
	},
	{
		name: 'Algorithmic',
		key: STABLECOINS_SETTINGS.ALGOSTABLES,
		filterFn: (item) => item.pegMechanism === 'algorithmic',
		help: 'Show algorithmic stablecoins'
	}
]

export function BackingType({ pathname, nestedMenu }: { pathname: string; nestedMenu: boolean }) {
	const router = useRouter()

	const { backing = [], chain, ...queries } = router.query

	const selectedValues = useMemo(() => {
		return stablecoinBackingOptions
			.filter((o) => {
				if (backing) {
					if (backing.length === 0) {
						return true
					} else if (typeof backing === 'string') {
						return o.key === backing
					} else {
						return backing.includes(o.key)
					}
				}
			})
			.map((o) => o.key)
	}, [backing])

	const setSelectedValues = (newFilters) => {
		if (selectedValues.length === 1 && newFilters.length === 0) {
			router.push(
				{
					pathname,
					query: {
						...queries,
						backing: 'None'
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
						backing: newFilters
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
					backing: stablecoinBackingOptions.map((o) => o.key)
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
					backing: 'None'
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	return (
		<Select
			allValues={stablecoinBackingOptions}
			selectedValues={selectedValues}
			setSelectedValues={setSelectedValues}
			selectOnlyOne={(newOption) => {
				setSelectedValues([newOption])
			}}
			label="Backing Type"
			clearAll={clearAll}
			toggleAll={toggleAll}
			nestedMenu={nestedMenu}
			labelType="smol"
		/>
	)
}
