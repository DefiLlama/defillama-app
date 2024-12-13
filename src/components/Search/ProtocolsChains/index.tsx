import { useRouter } from 'next/router'
import { DesktopSearch } from '~/components/Search/Base/Desktop'
import { IBaseSearchProps, ICommonSearchProps, SETS } from '../types'
import { DesktopProtocolFilters } from '~/components/Filters/protocols/Desktop'
import { TabletProtocolsFilters } from '~/components/Filters/protocols/Tablet'
import { DesktopTvlAndFeesFilters } from '~/components/Filters/protocols/Desktop'
import { TabletTvlAndFeesFilters } from '~/components/Filters/protocols/Tablet'
import { useInstantSearch, useSearchBox } from 'react-instantsearch'
import { SearchV2 } from '../InstantSearch'
import { useIsClient } from '~/hooks'
import { memo, useCallback, useMemo } from 'react'

interface IProtocolsChainsSearch extends ICommonSearchProps {
	includedSets?: SETS[]
	customPath?: IBaseSearchProps['customPath']
	options?: { name: string; key: string }[]
	hideFilters?: boolean
}

const empty = []
export const ProtocolsChainsSearch = memo(function ProtocolsChainsSearch({
	hideFilters,
	...props
}: IProtocolsChainsSearch) {
	const isClient = useIsClient()

	if (!isClient) {
		return <DesktopSearch {...props} data={empty} loading={true} filters={hideFilters ? null : <></>} />
	}

	return (
		<span style={{ minHeight: hideFilters ? '48px' : '96px' }}>
			<SearchV2 indexName="protocols">
				<Search hideFilters={hideFilters} {...props} />
			</SearchV2>
		</span>
	)
})

const Search = memo(function Search({ hideFilters = false, options, ...props }: IProtocolsChainsSearch) {
	const { refine } = useSearchBox()

	const { results, status } = useInstantSearch({ catchError: true })

	const onSearchTermChange = useCallback(
		(value: string) => {
			refine(value)
		},
		[refine]
	)

	const memoizedFilters = useMemo(() => (hideFilters ? null : <TvlOptions options={options} />), [hideFilters, options])

	return (
		<>
			<DesktopSearch
				{...props}
				data={results.hits}
				loading={status === 'loading'}
				filters={memoizedFilters}
				onSearchTermChange={onSearchTermChange}
			/>
		</>
	)
})

const TvlOptions = ({ options }: { options?: { name: string; key: string }[] }) => {
	const router = useRouter()

	if (router.pathname?.includes('/protocol/')) {
		if (!options || options.length === 0) return null

		return (
			<>
				<DesktopTvlAndFeesFilters options={options} />
				<TabletTvlAndFeesFilters options={options} />
			</>
		)
	}

	return (
		<>
			<DesktopProtocolFilters options={options} />
			<TabletProtocolsFilters options={options} />
		</>
	)
}
