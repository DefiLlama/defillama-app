import { useRouter } from 'next/router'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'

interface IYieldProjectsProps {
	projectList: Array<string>
	selectedProjects: Array<string>
	pathname: string
	label?: string
	query?: 'lendingProtocol' | 'farmProtocol'
	variant?: 'primary' | 'secondary'
	nestedMenu?: boolean
}

export function YieldProjects({
	projectList,
	selectedProjects,
	pathname,
	label,
	query,
	nestedMenu
}: IYieldProjectsProps) {
	const router = useRouter()

	const isFarmingProtocolFilter = query === 'farmProtocol'

	const { project, lendingProtocol, farmProtocol, ...queries } = router.query

	const setSelectedValues = (project) => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					...(query && (isFarmingProtocolFilter ? { lendingProtocol } : { farmProtocol })),
					[query || 'project']: project
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
					...(query && (isFarmingProtocolFilter ? { lendingProtocol } : { farmProtocol })),
					[query || 'project']: 'All'
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
					...(query && (isFarmingProtocolFilter ? { lendingProtocol } : { farmProtocol })),
					[query || 'project']: 'None'
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
					...(query && (isFarmingProtocolFilter ? { lendingProtocol } : { farmProtocol })),
					[query || 'project']: option
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	return (
		<SelectWithCombobox
			allValues={projectList}
			selectedValues={selectedProjects}
			setSelectedValues={setSelectedValues}
			clearAll={clearAll}
			toggleAll={toggleAll}
			selectOnlyOne={selectOnlyOne}
			label={label}
			nestedMenu={nestedMenu}
		/>
	)
}
