import * as React from 'react'
import { BaseSearch } from '~/components/Search/BaseSearch'
import type { IBaseSearchProps, ICommonSearchProps } from '~/components/Search/BaseSearch'
import { useFetchYieldsList, useFetchProjectsList } from '~/api/categories/yield/client'
import { AdvancedYieldsSearch } from './Advanced'
import { ToggleSearch } from './shared'
import { tokenIconUrl } from '~/utils'

interface IYieldSearchProps extends ICommonSearchProps {
	pathname?: string
}

export default function YieldsSearch({ pathname, ...props }: IYieldSearchProps) {
	const [advancedSearch, setAdvancedSearch] = React.useState(false)

	const { data: yields, loading: fetchingYields } = useFetchYieldsList()
	const { data: projects, loading: fetchingProjects } = useFetchProjectsList()

	const searchData: IBaseSearchProps['data'] =
		React.useMemo(() => {
			const yieldsList =
				yields?.map((el) => ({
					name: `${el.name} (${el.symbol.toUpperCase()})`,
					symbol: el.symbol.toUpperCase(),
					route: `${pathname}?token=${el.symbol.toUpperCase()}`,
					logo: el.image
				})) ?? []

			const projectList =
				projects?.map((p) => ({
					name: `Project - ${p.name}`,
					route: `${pathname}?project=${p.slug}`,
					logo: tokenIconUrl(p.slug)
				})) ?? []

			return [...yieldsList, ...projectList]
		}, [yields, projects, pathname]) ?? []

	if (!props.step?.hideOptions && advancedSearch) {
		return <AdvancedYieldsSearch setAdvancedSearch={setAdvancedSearch} pathname={pathname || '/yields'} />
	}

	return (
		<BaseSearch
			{...props}
			data={searchData}
			loading={fetchingYields || fetchingProjects}
			filters={
				!props.step?.hideOptions && (
					<ToggleSearch onClick={() => setAdvancedSearch(true)}>Switch to Advanced Search</ToggleSearch>
				)
			}
		/>
	)
}
