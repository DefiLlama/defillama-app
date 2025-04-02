import { useRouter } from 'next/router'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'

interface IFiltersByTokensProps {
	tokensList: Array<string>
	selectedTokens: Array<string>
	pathname: string
	variant?: 'primary' | 'secondary'
	nestedMenu?: boolean
}

export function FilterByToken({ tokensList = [], selectedTokens, pathname, nestedMenu }: IFiltersByTokensProps) {
	const router = useRouter()

	const { token, ...queries } = router.query

	const setSelectedValue = (newToken) => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					token: newToken
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
					token: 'All'
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
					...queries
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
					token: option
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	return (
		<SelectWithCombobox
			label="Tokens"
			allValues={tokensList}
			clearAll={clearAll}
			toggleAll={toggleAll}
			selectOnlyOne={selectOnlyOne}
			selectedValues={selectedTokens}
			setSelectedValues={setSelectedValue}
			nestedMenu={nestedMenu}
		/>
	)
}
