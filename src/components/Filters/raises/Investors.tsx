import { useRouter } from 'next/router'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'

interface IFiltersByInvestorProps {
	investors: string[]
	selectedInvestors: string[]
	pathname: string
	nestedMenu?: boolean
}

export function Investors({ investors = [], selectedInvestors, pathname, nestedMenu }: IFiltersByInvestorProps) {
	const router = useRouter()

	const { investor, ...queries } = router.query

	const setSelectedValues = (newInvestor) => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					investor: newInvestor
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const toggleAll = () => {
		if (!investor || investor === 'All') {
			router.push(
				{
					pathname,
					query: {
						...queries,
						investor: 'None'
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
						investor: 'All'
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
					investor: 'None'
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
					investor: option
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	return (
		<SelectWithCombobox
			label="Investors"
			allValues={investors}
			selectedValues={selectedInvestors}
			setSelectedValues={setSelectedValues}
			toggleAll={toggleAll}
			clearAll={clearAll}
			selectOnlyOne={selectOnlyOne}
			nestedMenu={nestedMenu}
		/>
	)
}
