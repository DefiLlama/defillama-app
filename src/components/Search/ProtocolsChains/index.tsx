import { useRouter } from 'next/router'
import { DesktopSearch } from '../Base'
import { IBaseSearchProps, ICommonSearchProps, SETS } from '../types'
import { DesktopProtocolFilters, TabletProtocolsFilters } from '~/components/Filters/protocols'
import { useGetDefiSearchList } from './hooks'
import { DesktopTvlAndFeesFilters } from '~/components/Filters/protocols/Desktop'
import { TabletTvlAndFeesFilters } from '~/components/Filters/protocols/Tablet'
import { instantMeiliSearch } from '@meilisearch/instant-meilisearch'
import { InstantSearch, useInstantSearch, useSearchBox } from 'react-instantsearch'
import { useMemo } from 'react'
// import { useState } from 'react'

interface IProtocolsChainsSearch extends ICommonSearchProps {
	includedSets?: SETS[]
	customPath?: IBaseSearchProps['customPath']
	options?: { name: string; key: string }[]
	hideFilters?: boolean
}

const { searchClient } = instantMeiliSearch(
	'https://search.defillama.com',
	'0050e4b518781e324a259db278687ec0031b9601c1c6a87aa7174c13ecdbd057'
)

export default function ProtocolsChainsSearch(props: IProtocolsChainsSearch) {
	return (
		<InstantSearch indexName="protocols" searchClient={searchClient} future={{ preserveSharedStateOnUnmount: true }}>
			<Search {...props} />
		</InstantSearch>
	)
}

const Search = (props: IProtocolsChainsSearch) => {
	const { refine, query } = useSearchBox()

	const { results, status, error } = useInstantSearch({ catchError: true })

	const { includedSets = Object.values(SETS), customPath, options, hideFilters = false } = props

	console.log({ query, hits: results.hits, status })

	const data = useMemo(() => {
		return results.hits.map((hit) => ({ name: JSON.stringify(hit), route: '/' }))
	}, [results])

	return (
		<>
			<DesktopSearch
				{...props}
				data={data}
				loading={status === 'loading'}
				filters={hideFilters ? null : <TvlOptions options={options} />}
				onSearchTermChange={(value) => {
					refine(value)
				}}
			/>
			<TvlOptions options={options} />
		</>
	)
}

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
