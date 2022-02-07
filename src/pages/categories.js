import { FullWrapper, PageWrapper } from 'components'
import { CustomLink } from 'components/Link'
import { GeneralLayout } from '../layout'
import { getProtocolsRaw, revalidate } from '../utils/dataApi'
import { ClickableText, DataText } from '../components/TokenList'
import { Box, Flex, Text } from 'rebass'
import styled from 'styled-components'
import { Divider } from 'components'
import Panel from 'components/Panel'
import { toK } from 'utils'

export async function getStaticProps() {
  const protocols = await getProtocolsRaw()

  const categories = {}
  protocols.protocols.forEach(p=>{
    const cat = p.category;
    if(categories[cat] === undefined){
        categories[cat] = {protocols:0, tvl:0}
    }
    categories[cat].protocols++;
    categories[cat].tvl+=p.tvl;
  })

  return {
    props: {
        categories: Object.entries(categories).sort((a,b)=>b[1].tvl-a[1].tvl)
    },
    revalidate: revalidate()
  }
}

const DashGrid = styled.div`
  grid-template-columns: 0.4fr 0.3fr 0.3fr 1.2fr;
  display: grid;
  grid-gap: 0.5em;
  padding: 0 1.125rem;
`

const descriptions = {
  "Dexes": "Protocols where you can swap/trade cryptocurrency",
  "Yield": "Protocols that pay you a reward for your staking/LP on their platform",
  "Lending": "Protocols that allow users to borrow and lend assets" ,
  "Cross Chain": "Protocols that add interoperability between different blockchains" ,
  "Staking": "Rewards/Liquidity for staked assets (cryptocurrency)" ,
  "Services": "Protocols that provide a service to the user" ,
  "Yield Aggregator": "Protocols that aggregated yield from diverse protocols" ,
  "Minting": "NFT Related (in work)" , 
  "Assets": "(will be removed)" ,
  "Derivatives": "Smart contracts that gets its value, risk, and basic term structure from an underlying asset" ,
  "Payments": "Offer the ability to pay/send/receive cryptocurrency" ,
  "Privacy": "Protocols that have the intention of hiding information about transactions" ,
  "Insurance": "Protocols that are designed to provide monetary protections" ,
  "Indexes": "Protocols that have a way to track/created the performance of a group of related assets",
  "Synthetics": "Protocol that created a tokenized derivative that mimics the value of another asset." ,
  "CDP": "Protocols that mint its own stablecoin using some collateral" ,
  "Bridge": "Protocols that bridge token from one network to another" ,
  "Reserve Currency": "Ohm fork: A protocol that uses a reserve of valuable assets acquired through bonding and staking to issue and back its native token" ,
  "Options": "Protocols that give you the right to buy an asset at a fixed price",
  "Launchpad": "Protocols that launch new projects and coins",
  "Gaming": "Protocols that have gaming components" ,
  "Prediction Market": "Protocols that allow you to wager/bet/buy in future results" ,
  "Algo-Stables": "From algorithmic coins to stablecoins",
}

export default function Protocols({ categories }) {
  return (
    <GeneralLayout title={`Categories - DefiLlama`} defaultSEO>
      <PageWrapper>
      <FullWrapper>
      <Panel style={{ marginTop: '6px' }} sx={{ padding: ['1rem 0 0 0', '1.25rem'] }}>
      <DashGrid center={true} style={{ height: 'fit-content', padding: '0 1.125rem 1rem 1.125rem' }}>
          {["Category", "Protocols", "Combined TVL", "Description"].map(column=><Flex key={column} alignItems="center" justifyContent="flexStart">
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
            {
            categories.map(([category, categoryData])=>
            <DashGrid style={{ height: '48px' }} focus={true} key={category}>
            <DataText area="name" fontWeight="500">
            <CustomLink href={`/protocols/${category}`}>{category}</CustomLink>
            </DataText>
            <DataText>{categoryData.protocols}</DataText>
            <DataText>{toK(categoryData.tvl)}</DataText>
            <DataText style={{
              textAlign: "left"
            }}>{descriptions[category] ?? ""}</DataText>
            </DashGrid>
            )}
        </Box>
        </Panel>
      </FullWrapper>
      </PageWrapper>
    </GeneralLayout>
  )
}
