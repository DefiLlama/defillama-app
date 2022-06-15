import { IList, IStep, SearchDefault } from 'components/Search/New'
import { peggedAssetIconUrl, standardizeProtocolName } from 'utils'
import { useFetchPeggedList } from 'utils/dataApi'

// TODO add pegged chains list
export default function PeggedSearch({ step }: { step: IStep }) {
  const { data, loading } = useFetchPeggedList()

  const searchData: IList[] =
    data?.peggedAssets?.map((asset) => ({
      logo: peggedAssetIconUrl(asset.name),
      route: `/peggedasset/${standardizeProtocolName(asset.name)}`,
      name: `${asset.name} (${asset.symbol})`,
    })) ?? []

  return <SearchDefault data={searchData} loading={loading} step={step} />
}
