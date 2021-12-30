import { GeneralLayout } from '../../layout'
import { PageWrapper, FullWrapper } from '../../components'
import NFTList from '../../components/NFTList'
import { RowBetween } from '../../components/Row'
import { TYPE } from '../../Theme'
import { chainIconUrl } from '../../utils'
import { getNFTChainsData, revalidate } from '../../utils/dataApi'
import SEO from 'components/SEO'

export async function getStaticProps() {
  const chainData = await getNFTChainsData()

  return {
    props: { chainData },
    revalidate: revalidate()
  }
}

const ChainsView = ({ chainData }) => {
  return (
    <PageWrapper>
      <FullWrapper>
        <RowBetween>
          <TYPE.largeHeader>Total Volume All Chains</TYPE.largeHeader>
        </RowBetween>
        <NFTList
          data={chainData}
          iconUrl={chainIconUrl}
          generateLink={name => `/nfts/chain/${name}`}
          columns={['chain', 'collections', 'dailyVolumeUSD', 'totalVolumeUSD']}
        />
      </FullWrapper>
    </PageWrapper>
  )
}

function Chains(props) {
  return (
    <GeneralLayout title="DefiLlama - NFT Dashboard">
      <SEO nftPage />
      <ChainsView {...props} />
    </GeneralLayout>
  )
}

export default Chains
