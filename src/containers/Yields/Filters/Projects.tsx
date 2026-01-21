import { useRouter } from 'next/router'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import type { ExcludeQueryKey } from '~/components/selectTypes'

interface IYieldProjectsProps {
	projectList: Array<string>
	selectedProjects: Array<string>
	label?: string
	nestedMenu?: boolean
	includeQueryKey: string
	excludeQueryKey: ExcludeQueryKey
}

export function YieldProjects({
	projectList,
	selectedProjects,
	label,
	nestedMenu,
	includeQueryKey,
	excludeQueryKey
}: IYieldProjectsProps) {
	const router = useRouter()

	const { project } = router.query

	return (
		<SelectWithCombobox
			allValues={projectList}
			selectedValues={selectedProjects}
			label={label}
			nestedMenu={nestedMenu}
			labelType={!project || project === 'All' ? 'none' : 'regular'}
			includeQueryKey={includeQueryKey}
			excludeQueryKey={excludeQueryKey}
		/>
	)
}
