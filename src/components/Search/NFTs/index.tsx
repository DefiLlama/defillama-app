import { useFetchNftCollectionsList } from '~/api/categories/nfts/client'
import { DesktopSearch } from '../Base'
import type { ICommonSearchProps } from '../types'

export function NFTsSearch(props: ICommonSearchProps) {
	const { data = [], loading: loading } = useFetchNftCollectionsList()

	return <DesktopSearch {...props} data={data} loading={loading} />
}
