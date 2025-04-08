import { useRouter } from 'next/router'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'

interface IFiltersBySectorsProps {
	sectors: string[]
	selectedSectors: string[]
	pathname: string
	nestedMenu?: boolean
}

export function Sectors({ sectors = [], selectedSectors, pathname, nestedMenu }: IFiltersBySectorsProps) {
	const router = useRouter()

	const { sector, ...queries } = router.query

	const setSelectedValues = (newSector) => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					sector: newSector
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const toggleAll = () => {
		if (!sector || sector === 'All') {
			router.push(
				{
					pathname,
					query: {
						...queries,
						sector: 'None'
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
						sector: 'All'
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
					sector: 'None'
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
					sector: option
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	return (
		<SelectWithCombobox
			label="Sectors"
			allValues={sectors}
			selectedValues={selectedSectors}
			setSelectedValues={setSelectedValues}
			toggleAll={toggleAll}
			clearAll={clearAll}
			selectOnlyOne={selectOnlyOne}
			nestedMenu={nestedMenu}
			labelType={!sector || sector === 'All' ? 'none' : 'regular'}
		/>
	)
}
