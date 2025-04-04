import { useRouter } from 'next/router'
import { STABLECOINS_SETTINGS } from '~/contexts/LocalStorage'
import { useMemo } from 'react'
import { Select } from '~/components/Select'

const { DEPEGGED } = STABLECOINS_SETTINGS

export const stablecoinAttributeOptions = [
	{
		name: 'Depegged',
		key: DEPEGGED,
		filterFn: (item) => true,
		help: 'Show stablecoins depegged by 10% or more'
	}
]

export function Attribute({ pathname, nestedMenu }: { pathname: string; nestedMenu: boolean }) {
	const router = useRouter()

	const { attribute = [], chain, ...queries } = router.query

	const selectedValues = useMemo(() => {
		return stablecoinAttributeOptions
			.filter((o) => {
				if (attribute) {
					if (attribute.length === 0) {
						return true
					} else if (typeof attribute === 'string') {
						return o.key === attribute
					} else {
						return attribute.includes(o.key)
					}
				}
			})
			.map((o) => o.key)
	}, [attribute])

	const setSelectedValues = (newFilters) => {
		if (selectedValues.length === 1 && newFilters.length === 0) {
			router.push(
				{
					pathname,
					query: {
						...queries,
						attribute: 'None'
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
						attribute: newFilters
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
					attribute: stablecoinAttributeOptions.map((o) => o.key)
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
					attribute: 'None'
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	return (
		<Select
			allValues={stablecoinAttributeOptions}
			selectedValues={selectedValues}
			setSelectedValues={setSelectedValues}
			label="Attribute"
			clearAll={clearAll}
			toggleAll={toggleAll}
			nestedMenu={nestedMenu}
			labelType="smol"
		/>
	)
}
