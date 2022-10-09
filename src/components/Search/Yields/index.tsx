import * as React from 'react'
import { DesktopSearch } from '../Base'
import type { ICommonSearchProps } from '../types'
import { AdvancedYieldsSearch } from './Advanced'
import { ToggleSearch } from './shared'
import { useGetYieldsSearchList } from './hooks'
import { TYPE } from '~/Theme'

interface IYieldSearchProps extends ICommonSearchProps {
	pathname?: string
	poolsNumber?: number
	projectsNumber?: number
	chainsNumber?: number
}

export default function YieldsSearch({
	pathname,
	poolsNumber,
	projectsNumber,
	chainsNumber,
	...props
}: IYieldSearchProps) {
	const [advancedSearch, setAdvancedSearch] = React.useState(false)

	const { data, loading, onItemClick } = useGetYieldsSearchList()

	if (!props.step?.hideOptions && advancedSearch) {
		return <AdvancedYieldsSearch setAdvancedSearch={setAdvancedSearch} pathname={pathname || '/yields'} />
	}

	return (
		<DesktopSearch
			{...props}
			data={data}
			loading={loading}
			filters={
				!props.step?.hideOptions && (
					<>
						{poolsNumber ? (
							<TYPE.heading>
								Tracking {poolsNumber} pools over {projectsNumber} protocols on {chainsNumber} chains.
							</TYPE.heading>
						) : null}
						<ToggleSearch onClick={() => setAdvancedSearch(true)}>Switch to Advanced Search</ToggleSearch>
					</>
				)
			}
			onItemClick={onItemClick}
			placeholder="Filter by token..."
		/>
	)
}
