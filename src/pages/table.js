import { ClickableText, DataText } from '../components/TokenList'
import { GeneralLayout } from '../layout'
import { revalidate, getSimpleProtocolsPageData } from '../utils/dataApi'
import { Box, Flex, Text } from 'rebass'
import { ChainLogo } from 'components/ChainsRow'
import { CustomLink } from 'components/Link'
import Row from 'components/Row'
import styled from 'styled-components'
import { Divider } from 'components'
import { PageWrapper, FullWrapper } from 'components'
import Panel from 'components/Panel'

const categories = ["Dexes", "Lending", "Yield", "Staking", "Minting", "Options", "Derivatives",] // bridge, stablecoins, nft exchange

export async function getStaticProps({ params }) {
  const { protocols, chains }  = await getSimpleProtocolsPageData([
    'name',
    'extraTvl',
    'chainTvls',
    'category'
  ])
  const topProtocolPerChainAndCategory = Object.fromEntries(chains.map(c=>[c, {}]))
  protocols.forEach(p=>{
      const {chainTvls, category, name} = p
      Object.entries(chainTvls).forEach(([chain, tvl])=>{
          if(topProtocolPerChainAndCategory[chain] === undefined){
              return
          }
          const currentTopProtocol = topProtocolPerChainAndCategory[chain][category]
          if(currentTopProtocol === undefined || tvl > currentTopProtocol[1]){
            topProtocolPerChainAndCategory[chain][category] = [name, tvl]
          }
      })
  })
  return {
    props: {
      chains: chains.map(c=>({name:c, categories: topProtocolPerChainAndCategory[c]})),
    },
    revalidate: revalidate()
  }
}

const Index = styled.div`` // TODO: FIX

const ListItem = ({ item, index }) => {
    return (
      <DashGrid style={{ height: '48px' }} focus={true}>
        <DataText area="name" fontWeight="500">
          <Row style={{ gap: '1rem', minWidth: '100%' }}>
            <Index>{index + 1}</Index>
            <ChainLogo chain={item.name} />
            <CustomLink href={item.name}>
              {/*<ProtocolButton item={item} />*/}
              {item.name}
            </CustomLink>
          </Row>
        </DataText>
        {categories.map(category=><DataText key={category}>{item.categories[category]?.[0]}</DataText>)}
        </DashGrid>
    )
}

const DashGrid = styled.div`
  grid-template-columns: 0.4fr 0.4fr 0.4fr 0.4fr 0.4fr 0.4fr 0.4fr 0.4fr;
  display: grid;
  grid-gap: 0.5em;
  padding: 0 1.125rem;
`

export default function Chains({ chains }) {
  return (
    <GeneralLayout title={`TVL Rankings - DefiLlama`} defaultSEO>
      <PageWrapper>
      <FullWrapper>
      <Panel style={{ marginTop: '6px' }} sx={{ padding: ['1rem 0 0 0', '1.25rem'] }}>
      <DashGrid center={true} style={{ height: 'fit-content', padding: '0 1.125rem 1rem 1.125rem' }}>
          {["Chain", ...categories].map(column=><Flex key={column} alignItems="center" justifyContent="flexStart">
          <ClickableText
            area="name"
            fontWeight="500"
          >
            {column}
          </ClickableText>
        </Flex>)}
        </DashGrid>
        <Divider />
        <Box>
            {chains.map((chain, index)=><ListItem key={index} index={index} item={chain} />)}
        </Box>
        </Panel>
        </FullWrapper>
    </PageWrapper>
    </GeneralLayout>
  )
}
