import { BaseSearch } from '~/components/Search/BaseSearch'
import type { IBaseSearchProps, ICommonSearchProps } from '~/components/Search/BaseSearch'
import { tokenIconUrl, standardizeProtocolName } from '~/utils'
import { useFetchDexsList } from '~/api/categories/dexs/client'

interface IDexsSearchProps extends ICommonSearchProps {}

// TODO add pegged chains list
export default function DexsSearch(props: IDexsSearchProps) {
	const { data, loading } = useFetchDexsList()

	const searchData: IBaseSearchProps['data'] =
		data?.dexs?.map((asset) => ({
			logo: tokenIconUrl(asset.name),
			route: `/dex/${standardizeProtocolName(asset.name)}`,
			name: asset.name
		})) ?? []

	return <BaseSearch {...props} data={searchData} loading={loading} />
}
