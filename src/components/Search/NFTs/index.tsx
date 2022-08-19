import { DesktopSearch } from '../Base'
import type { ICommonSearchProps } from '../types'
import { useGetNftsSearchList } from './hooks'

interface INFTSearchProps extends ICommonSearchProps {
	preLoadedSearch: Array<{
		name: string
		route: string
		logo: string
	}>
}

export default function NFTsSearch(props: INFTSearchProps) {
	const { data, loading, onSearchTermChange } = useGetNftsSearchList()

	return <DesktopSearch {...props} data={data} loading={loading} onSearchTermChange={onSearchTermChange} />
}
