import { BaseSearch } from 'components/Search/OpenSearch/BaseSearch'
import type { IBaseSearchProps, ICommonSearchProps } from 'components/Search/OpenSearch/BaseSearch'
import { peggedAssetIconUrl, standardizeProtocolName } from 'utils'
import { useFetchPeggedList } from 'utils/dataApi'

interface IPeggedSearchProps extends ICommonSearchProps {}

// TODO add pegged chains list
export default function PeggedSearch(props: IPeggedSearchProps) {
  const { step } = props
  const { data, loading } = useFetchPeggedList()

  const searchData: IBaseSearchProps['data'] =
    data?.peggedAssets?.map((asset) => ({
      logo: peggedAssetIconUrl(asset.name),
      route: `/peggedasset/${standardizeProtocolName(asset.name)}`,
      name: `${asset.name} (${asset.symbol})`,
    })) ?? []

  return <BaseSearch {...props} data={searchData} loading={loading} />
}
