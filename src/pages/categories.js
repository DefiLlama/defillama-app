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
        categories: Object.entries(categories).sort((a,b)=>b.tvl-a.tvl)
    },
    revalidate: revalidate()
  }
}

const DashGrid = styled.div`
  grid-template-columns: 0.4fr 0.4fr 0.4fr;
  display: grid;
  grid-gap: 0.5em;
  padding: 0 1.125rem;
`

export default function Protocols({ categories }) {
  return (
    <GeneralLayout title={`Categories - DefiLlama`} defaultSEO>
      <PageWrapper>
      <FullWrapper>
      <Panel style={{ marginTop: '6px' }} sx={{ padding: ['1rem 0 0 0', '1.25rem'] }}>
      <DashGrid center={true} style={{ height: 'fit-content', padding: '0 1.125rem 1rem 1.125rem' }}>
          {["Category", "Protocols", "Combined TVL"].map(column=><Flex key={column} alignItems="center" justifyContent="flexStart">
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
            </DashGrid>
            )}
        </Box>
        </Panel>
      </FullWrapper>
      </PageWrapper>
    </GeneralLayout>
  )
}
