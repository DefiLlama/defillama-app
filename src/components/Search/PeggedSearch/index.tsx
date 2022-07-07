import { BaseSearch } from '~/components/Search/BaseSearch'
import type { IBaseSearchProps, ICommonSearchProps } from '~/components/Search/BaseSearch'
import { peggedAssetIconUrl, standardizeProtocolName } from '~/utils'
import { useFetchPeggedList } from '~/api/categories/stablecoins/client'

interface IPeggedSearchProps extends ICommonSearchProps {}

// TODO add pegged chains list
export default function PeggedSearch(props: IPeggedSearchProps) {
	const { data, loading } = useFetchPeggedList()

	const searchData: IBaseSearchProps['data'] =
		data?.peggedAssets?.map((asset) => ({
			logo: peggedAssetIconUrl(asset.name),
			route: `/stablecoin/${standardizeProtocolName(asset.name)}`,
			name: `${asset.name} (${asset.symbol})`
		})) ?? []

	return <BaseSearch {...props} data={searchData} loading={loading} />
}
