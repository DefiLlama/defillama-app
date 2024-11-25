import { useRouter } from 'next/router'
import { DesktopSearch } from '~/components/Search/Base/Desktop'
import { IBaseSearchProps, ICommonSearchProps, SETS } from '../types'
import { DesktopProtocolFilters } from '~/components/Filters/protocols/Desktop'
import { TabletProtocolsFilters } from '~/components/Filters/protocols/Tablet'
import { DesktopTvlAndFeesFilters } from '~/components/Filters/protocols/Desktop'
import { TabletTvlAndFeesFilters } from '~/components/Filters/protocols/Tablet'
import { useInstantSearch, useSearchBox } from 'react-instantsearch'
import { SearchV2 } from '../InstantSearch'
import { useFormatDefiSearchResults } from './hooks'
import { useIsClient } from '~/hooks'

interface IProtocolsChainsSearch extends ICommonSearchProps {
	includedSets?: SETS[]
	customPath?: IBaseSearchProps['customPath']
	options?: { name: string; key: string }[]
	hideFilters?: boolean
}

export function ProtocolsChainsSearch({ hideFilters, ...props }: IProtocolsChainsSearch) {
	const isClient = useIsClient()

	if (!isClient) {
		return <DesktopSearch {...props} data={[]} loading={true} filters={<></>} />
	}

	return (
		<SearchV2 indexName="protocols">
			<Search hideFilters={hideFilters} {...props} />
		</SearchV2>
	)
}

const Search = ({ hideFilters = false, options, ...props }: IProtocolsChainsSearch) => {
	const { refine } = useSearchBox()

	const { results, status } = useInstantSearch({ catchError: true })

	const data = useFormatDefiSearchResults(results)

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
