import { GeneralLayout } from '../../layout'
import { PageWrapper, FullWrapper } from '../../components'
import NFTList from '../../components/NFTList'
import { RowBetween } from '../../components/Row'
import { ButtonDark } from '../../components/ButtonStyled'
import { TYPE } from '../../Theme'
import { chainIconUrl } from '../../utils'
import { getNFTChainsData, revalidate } from '../../utils/dataApi'

export async function getStaticProps() {
  const chainData = await getNFTChainsData();

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
          columns={['chain', 'collections', 'dailyVolume', 'totalVolume']}
        />
        <div style={{ margin: 'auto' }}>
          <ButtonDark onClick={() => {}}>Download all data in .csv</ButtonDark>
        </div>
      </FullWrapper>
    </PageWrapper>
  )
}

function Chains(props) {
  return (
    <GeneralLayout title="DefiLlama - NFT Dashboard">
      <ChainsView {...props} />
    </GeneralLayout>
  )
}

export default Chains
