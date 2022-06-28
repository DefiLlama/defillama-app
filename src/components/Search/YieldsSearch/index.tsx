import * as React from 'react'
import { BaseSearch } from '~/components/Search/BaseSearch'
import type { IBaseSearchProps, ICommonSearchProps } from '~/components/Search/BaseSearch'
import { useFetchYieldsList } from '~/utils/categories/yield'
import { AdvancedYieldsSearch } from './Advanced'
import { ToggleSearch } from './shared'

interface IYieldSearchProps extends ICommonSearchProps {
	setTokensToFilter?: React.Dispatch<
		React.SetStateAction<{
			includeTokens: string[]
			excludeTokens: string[]
		}>
	>
}

export default function YieldsSearch({ setTokensToFilter, ...props }: IYieldSearchProps) {
	const [advancedSearch, setAdvancedSearch] = React.useState(false)

	const { data, loading } = useFetchYieldsList()

	const searchData: IBaseSearchProps['data'] =
		React.useMemo(() => {
			return (
				data?.map((el) => ({
					name: `${el.name} (${el.symbol.toUpperCase()})`,
					symbol: el.symbol.toUpperCase(),
					route: `/yields/token/${el.symbol.toUpperCase()}`,
					logo: el.image
				})) ?? []
			)
		}, [data]) ?? []

	if (!props.step?.hideOptions && advancedSearch) {
		return <AdvancedYieldsSearch setAdvancedSearch={setAdvancedSearch} setTokensToFilter={setTokensToFilter} />
	}

	return (
		<BaseSearch
			{...props}
			data={searchData}
			loading={loading}
			filters={
				!props.step?.hideOptions && (
					<ToggleSearch onClick={() => setAdvancedSearch(true)}>Switch to Advanced Search</ToggleSearch>
				)
			}
		/>
	)
}
