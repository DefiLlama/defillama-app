import React from 'react'

import { TYPE } from '../Theme'
import Panel from '../components/Panel'
import { PageWrapper, FullWrapper } from '../components'
import { RowBetween } from '../components/Row'
import styled from 'styled-components'
import { Divider } from '../components'
import Link from '../components/Link'
import { GeneralLayout } from '../layout'


function AboutPage() {
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
    return (
        <GeneralLayout title="DefiLlama - DeFi Dashboard">
            <PageWrapper>
                <FullWrapper>
                    <RowBetween>
                        <TYPE.largeHeader>About</TYPE.largeHeader>
                    </RowBetween>
                    <Panel style={{ marginTop: '6px' }}>
                        <DashGrid center={true} style={{ height: 'fit-content', padding: '0 0 1rem 0' }}>
                            <TYPE.main area="account">Why DefiLlama? <span role="img" aria-label="heart emoji">❤️</span></TYPE.main>
                            <Divider />

                            <TYPE.light>DefiLlama is committed to accurate data without ads or sponsored content and transparency.</TYPE.light>
                            <TYPE.light>We list DeFi projects from all chains.</TYPE.light>
                            <Divider />

                            <TYPE.light>Thanks to <Link href="https://www.coingecko.com/">CoinGecko</Link></TYPE.light>

                            <Divider />
                            <TYPE.light>Based on <Link href="https://github.com/Uniswap/uniswap-info">Uniswap.info</Link></TYPE.light>
                            <Divider />
                            <TYPE.light>Contact us on <Link href="https://twitter.com/defillama">Twitter</Link> or <Link href="https://discord.gg/buPFYXzDDd">Discord</Link></TYPE.light>
                        </DashGrid>
                    </Panel>
                </FullWrapper>
            </PageWrapper>
        </GeneralLayout>
    )
}

export default AboutPage