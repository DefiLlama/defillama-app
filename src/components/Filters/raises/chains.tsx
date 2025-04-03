import { useRouter } from 'next/router'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'

interface IFiltersByChainsProps {
	chains: string[]
	selectedChains: string[]
	pathname: string
	nestedMenu?: boolean
}

export function Chains({ chains = [], selectedChains, pathname, nestedMenu }: IFiltersByChainsProps) {
	const router = useRouter()

	const { chain, ...queries } = router.query

	const setSelectedValues = (newChain) => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					chain: newChain
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const toggleAll = () => {
		if (!chain || chain === 'All') {
			router.push(
				{
					pathname,
					query: {
						...queries,
						chain: 'None'
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
						chain: 'All'
					}
				},
				undefined,
				{ shallow: true }
			)
		}
	}

	const clearAll = () => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					chain: 'None'
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const selectOnlyOne = (option: string) => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					chain: option
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	return (
		<SelectWithCombobox
			label="Chains"
			allValues={chains}
			selectedValues={selectedChains}
			setSelectedValues={setSelectedValues}
			toggleAll={toggleAll}
			clearAll={clearAll}
			selectOnlyOne={selectOnlyOne}
			nestedMenu={nestedMenu}
			labelType={!chain || chain === 'All' ? 'none' : 'regular'}
		/>
	)
}
