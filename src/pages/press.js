import React from 'react'

import { TYPE } from '../Theme'
import Panel from '../components/Panel'
import { PageWrapper, FullWrapper } from '../components'
import { RowBetween } from '../components/Row'
import styled from 'styled-components'
import { Divider } from '../components'
import Link from '../components/Link'
import PressLogo from '../components/PressLogo'
import { AutoColumn } from '../components/Column'
import { Text, Box } from 'rebass'

import { GeneralLayout } from '../layout'



function PressPage() {
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

    return (
        <GeneralLayout title="DefiLlama - DeFi Dashboard">
            <PageWrapper>
                <FullWrapper>
                    <RowBetween>
                        <TYPE.largeHeader>Press & Media</TYPE.largeHeader>
                    </RowBetween>
                    <Panel style={{ marginTop: '6px' }}>
                        <DashGrid center={true} style={{ height: 'fit-content', padding: '0 0 1rem 0' }}>
                            <TYPE.main area="account">Mission</TYPE.main>
                            <Divider />
                            <TYPE.main>DefiLlama is the largest TVL aggregator for DeFi (Decentralized Finance). Our data is fully open-source and maintained by a team of passionate individuals and contributors from hundreds of protocols.</TYPE.main>
                            <TYPE.main>Our focus is on accurate data and transparent methodology.</TYPE.main>
                            <TYPE.main>We track over 800 DeFi protocols from over 80 different blockchains.</TYPE.main>
                        </DashGrid>
                    </Panel>
                    <Panel style={{ marginTop: '6px' }}>
                        <DashGrid center={true} style={{ height: 'fit-content', padding: '0 0 1rem 0' }}>
                            <TYPE.main area="account">Press</TYPE.main>
                            <Divider />
                            <TYPE.main>If you are working on a story with our data or need to get in touch, contact: <Link href="mailto:defillama@protonmail.com">llamapress@protonmail.com</Link></TYPE.main>
                            <Divider />
                            <TYPE.main>DeFiLlama is used across a large number of media organisations and financial instituions.</TYPE.main>
                            <PanelWrapper mt={[0, 0, '1rem']} style={{ gridTemplateRows: 'auto' }}>
                              <Panel style={{ padding: '18px 25px' }}>
                                <AutoColumn gap="4px">
                                  <PressLogo logo={`/press/bloomberg.png`} size={150} />
                                </AutoColumn>
                              </Panel>
                              <Panel style={{ padding: '18px 25px' }}>
                              <AutoColumn gap="4px">
                                <PressLogo logo={`/press/boa.png`} size={150} />
                              </AutoColumn>
                              </Panel>
                              <Panel style={{ padding: '18px 25px' }}>
                              <AutoColumn gap="4px">
                                <PressLogo logo={`/press/bi.png`} size={150} />
                              </AutoColumn>
                              </Panel>
                              <Panel style={{ padding: '18px 25px' }}>
                              <AutoColumn gap="4px">
                                <PressLogo logo={`/press/cmc.png`} size={150} />
                              </AutoColumn>
                              </Panel>
                              <Panel style={{ padding: '18px 25px' }}>
                              <AutoColumn gap="4px">
                                <PressLogo logo={`/press/coindesk.png`} size={150} />
                              </AutoColumn>
                              </Panel>
                              <Panel style={{ padding: '18px 25px' }}>
                              <AutoColumn gap="4px">
                                <PressLogo logo={`/press/ct.png`} size={150} />
                              </AutoColumn>
                              </Panel>
                              <Panel style={{ padding: '18px 25px' }}>
                              <AutoColumn gap="4px">
                                <PressLogo logo={`/press/gs.png`} size={150} />
                              </AutoColumn>
                              </Panel>
                              <Panel style={{ padding: '18px 25px' }}>
                              <AutoColumn gap="4px">
                                <PressLogo logo={`/press/coingecko.png`} size={150} />
                              </AutoColumn>
                              </Panel>
                              <Panel style={{ padding: '18px 25px' }}>
                              <AutoColumn gap="4px">
                                <PressLogo logo={`/press/ms.png`} size={150} />
                              </AutoColumn>
                              </Panel>
                              <Panel style={{ padding: '18px 25px' }}>
                              <AutoColumn gap="4px">
                                <PressLogo logo={`/press/nasdaq.png`} size={150} />
                              </AutoColumn>
                              </Panel>
                              <Panel style={{ padding: '18px 25px' }}>
                              <AutoColumn gap="4px">
                                <PressLogo logo={`/press/wsj.png`} size={150} />
                              </AutoColumn>
                              </Panel>
                              <Panel style={{ padding: '18px 25px' }}>
                              <AutoColumn gap="4px">
                                <PressLogo logo={`/press/yahoo.png`} size={150} />
                              </AutoColumn>
                              </Panel>
                            </PanelWrapper>


                        </DashGrid>
                    </Panel>
                    <Panel style={{ marginTop: '6px' }}>
                        <DashGrid center={true} style={{ height: 'fit-content', padding: '0 0 1rem 0' }}>
                            <TYPE.main area="account">Branding Assets</TYPE.main>
                            <Divider />
                            <TYPE.main>You can download all our branding assets from our repo <Link href="https://github.com/DefiLlama">by clicking here.</Link></TYPE.main>

                        </DashGrid>
                    </Panel>
                </FullWrapper>
            </PageWrapper>
        </GeneralLayout>
    )
}

export default PressPage
