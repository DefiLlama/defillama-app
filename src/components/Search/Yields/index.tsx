import * as React from 'react'
import { DesktopSearch } from '../Base'
import type { ICommonSearchProps } from '../types'
import { AdvancedYieldsSearch } from './Advanced'
import { ToggleSearch } from './shared'
import { useGetYieldsSearchList } from './hooks'

interface IYieldSearchProps extends ICommonSearchProps {
	pathname?: string
}

export default function YieldsSearch({ pathname, ...props }: IYieldSearchProps) {
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
					<ToggleSearch onClick={() => setAdvancedSearch(true)}>Switch to Advanced Search</ToggleSearch>
				)
			}
			onItemClick={onItemClick}
		/>
	)
}
