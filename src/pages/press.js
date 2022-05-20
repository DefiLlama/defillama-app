import React from 'react'
import { TYPE } from '../Theme'
import { RowBetween } from '../components/Row'
import styled from 'styled-components'
import { Divider, Panel } from '../components'
import Link from '../components/Link'
import PressLogo from '../components/PressLogo'
import { AutoColumn } from '../components/Column'
import { Box } from 'rebass'
import Layout from '../layout'

const PressPanel = ({ imageFilename }) => (
  <Panel style={{ padding: '18px 25px' }}>
    <AutoColumn gap="4px">
      <PressLogo logo={`/press/${imageFilename}`} size={150} />
    </AutoColumn>
  </Panel>
)

const pressList = [
  'bloomberg.png',
  'boa.png',
  'bi.png',
  'cmc.png',
  'coindesk.png',
  'ct.png',
  'gs.png',
  'coingecko.png',
  'ms.png',
  'nasdaq.png',
  'wsj.png',
  'yahoo.png',
]

const DashGrid = styled.div`
  display: grid;
  grid-gap: 1em;
  grid-template-columns: 1fr;
  grid-template-areas: 'account';
  padding: 0 4px;

  > * {
    justify-content: flex-end;
  }
`
const PanelWrapper = styled(Box)`
  grid-template-columns: repeat(6, 1fr);
  grid-template-rows: max-content;
  gap: 6px;
  display: inline-grid;
  width: 100%;
  align-items: start;
  @media screen and (max-width: 1024px) {
    grid-template-columns: 1fr;
    align-items: stretch;
    > * {
      grid-column: 1 / 4;
    }

    > * {
      &:first-child {
        width: 100%;
      }
    }
  }
`

function PressPage() {
  return (
    <Layout title="DefiLlama - DeFi Dashboard" defaultSEO>
      <RowBetween>
        <TYPE.largeHeader>Press & Media</TYPE.largeHeader>
      </RowBetween>
      <Panel style={{ marginTop: '6px' }}>
        <DashGrid center={true} style={{ height: 'fit-content', padding: '0 0 1rem 0' }}>
          <TYPE.heading>Mission</TYPE.heading>
          <Divider />
          <TYPE.main>
            DefiLlama is the largest TVL aggregator for DeFi (Decentralized Finance). Our data is fully open-source
            and maintained by a team of passionate individuals and contributors from hundreds of protocols.
          </TYPE.main>
          <TYPE.main>Our focus is on accurate data and transparent methodology.</TYPE.main>
          <TYPE.main>We track over 800 DeFi protocols from over 80 different blockchains.</TYPE.main>
        </DashGrid>
      </Panel>
      <Panel style={{ marginTop: '6px' }}>
        <DashGrid center={true} style={{ height: 'fit-content', padding: '0 0 1rem 0' }}>
          <TYPE.heading>Press</TYPE.heading>
          <Divider />
          <TYPE.main>
            If you are working on a story using our data or need to get in touch, contact:{' '}
            <Link href="mailto:defillama@protonmail.com">llamapress@protonmail.com</Link>
          </TYPE.main>
          <Divider />
          <TYPE.main>
            DeFiLlama is used across a large number of media organisations and financial institutions.
          </TYPE.main>
          <PanelWrapper mt={[0, 0, '1rem']} style={{ gridTemplateRows: 'auto' }}>
            {pressList.map((imageFilename) => (
              <PressPanel imageFilename={imageFilename} key={imageFilename} />
            ))}
          </PanelWrapper>
        </DashGrid>
      </Panel>
      <Panel style={{ marginTop: '6px' }}>
        <DashGrid center={true} style={{ height: 'fit-content', padding: '0 0 1rem 0' }}>
          <TYPE.heading>Branding Assets</TYPE.heading>
          <Divider />
          <TYPE.main>
            You can download all our branding assets from <Link href="/defillama-press-kit.zip">here</Link>.
          </TYPE.main>
        </DashGrid>
      </Panel>
    </Layout>
  )
}

export default PressPage
