import { useRouter } from 'next/router'
import { SelectWithCombobox } from '../../SelectWithCombobox'

interface IFiltersByChainProps {
	chainList: string[]
	selectedChains: string[]
	pathname: string
	nestedMenu?: boolean
}

export function FilterByChain({ chainList = [], selectedChains, pathname, nestedMenu }: IFiltersByChainProps) {
	const router = useRouter()

	const { chain, ...queries } = router.query

	const setSelectedValue = (newChain) => {
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

	const toggleAll = () => {
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
			allValues={chainList}
			clearAll={clearAll}
			toggleAll={toggleAll}
			selectOnlyOne={selectOnlyOne}
			selectedValues={selectedChains}
			setSelectedValues={setSelectedValue}
			nestedMenu={nestedMenu}
			labelType={!chain || chain === 'All' ? 'none' : 'regular'}
		/>
	)
}
