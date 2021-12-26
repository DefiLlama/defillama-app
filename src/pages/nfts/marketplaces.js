import { GeneralLayout } from '../../layout'
import { PageWrapper, FullWrapper } from '../../components'
import NFTList from '../../components/NFTList'
import { RowBetween } from '../../components/Row'
import { TYPE } from '../../Theme'
import { tokenIconUrl } from '../../utils'
import { getNFTMarketplacesData, revalidate } from '../../utils/dataApi'

export async function getStaticProps() {
  const marketplaceData = await getNFTMarketplacesData()

  return {
    props: { marketplaceData },
    revalidate: revalidate()
  }
}

const MarketplacesView = ({ marketplaceData }) => {
  return (
    <PageWrapper>
      <FullWrapper>
        <RowBetween>
          <TYPE.largeHeader>Total Volume All Marketplaces</TYPE.largeHeader>
        </RowBetween>
        <NFTList
          data={marketplaceData}
          iconUrl={tokenIconUrl}
          generateLink={name => `/nfts/marketplace/${name}`}
          columns={['marketplace', 'collections', 'dailyVolumeUSD', 'totalVolumeUSD']}
          type='marketplaces'
        />
      </FullWrapper>
    </PageWrapper>
  )
}

function Chains(props) {
  return (
    <GeneralLayout title="DefiLlama - NFT Dashboard">
      <MarketplacesView {...props} />
    </GeneralLayout>
  )
}

export default Chains
