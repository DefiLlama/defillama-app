import { useRouter } from 'next/router'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'

interface IFiltersByRoundsProps {
	rounds: string[]
	selectedRounds: string[]
	pathname: string
	nestedMenu?: boolean
}

export function Rounds({ rounds = [], selectedRounds, pathname, nestedMenu }: IFiltersByRoundsProps) {
	const router = useRouter()

	const { round, ...queries } = router.query

	const setSelectedValues = (newRound) => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					round: newRound
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const toggleAll = () => {
		if (!round || round === 'All') {
			router.push(
				{
					pathname,
					query: {
						...queries,
						round: 'None'
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
						round: 'All'
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
					round: 'None'
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
					round: option
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	return (
		<SelectWithCombobox
			label="Rounds"
			allValues={rounds}
			selectedValues={selectedRounds}
			setSelectedValues={setSelectedValues}
			toggleAll={toggleAll}
			clearAll={clearAll}
			selectOnlyOne={selectOnlyOne}
			nestedMenu={nestedMenu}
		/>
	)
}
