import { useRouter } from 'next/router'
import type { ExcludeQueryKey } from '~/components/selectTypes'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { trackYieldsEvent, YIELDS_EVENTS } from '~/utils/analytics/yields'

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
			onValuesChange={(values) => {
				values.forEach((project) => {
					trackYieldsEvent(YIELDS_EVENTS.FILTER_PROJECT, { project })
				})
			}}
		/>
	)
}
