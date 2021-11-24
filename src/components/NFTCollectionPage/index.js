import React from 'react'
import styled from 'styled-components'
import { transparentize } from 'polished'
import { useMedia } from 'react-use'
import { Box } from 'rebass'
import dynamic from 'next/dynamic'

import Header from './Header'
import Section from './Section'
import Links from './Links'

import { formattedNum } from '../../utils'

import { RowBetween } from '../../components/Row'
import { PageWrapper, ContentWrapper } from '../../components'
import Panel from '../../components/Panel'
import { TYPE, ThemedBackground } from '../../Theme'
import { useCollectionChartData, useNFTCollection } from 'contexts/NFTData'
import LocalLoader from 'components/LocalLoader'
import { useProtocolColor } from 'hooks'

const DashboardWrapper = styled(Box)`
  width: 100%;
`

export const DetailsLayout = styled.div`
  display: inline-grid;
  width: 100%;
  grid-template-columns: auto auto auto 1fr;
  column-gap: 30px;
  align-items: start;

  &:last-child {
    align-items: center;
    justify-items: end;
  }
  @media screen and (max-width: 1024px) {
    grid-template-columns: 1fr;
    align-items: stretch;
    > * {
      grid-column: 1 / 4;
      margin-bottom: 1rem;
      display: table-row;
      > * {
        margin-bottom: 1rem;
      }
    }

    &:last-child {
      align-items: start;
      justify-items: start;
    }
  }
`

const PanelWrapper = styled(Box)`
  grid-template-columns: repeat(3, 1fr);
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

const GlobalNFTChart = dynamic(() => import('../GlobalNFTChart'), {
  ssr: false
})

function NFTCollectionPage({ collection, chartData }) {
  const below1600 = useMedia('(max-width: 1600px)')
  const below1024 = useMedia('(max-width: 1024px)')
  const below800 = useMedia('(max-width: 800px)')
  const below600 = useMedia('(max-width: 600px)')
  const below500 = useMedia('(max-width: 500px)')
  const below850 = useMedia('(max-width: 850px)')

  const { address, description, logo, name, slug, website, twitterUsername, discordUrl, telegramUrl } = collection || {}

  const backgroundColor = useProtocolColor({ protocol: slug, logo, transparent: false })

  const links = {
    website,
    discord: discordUrl,
    telegram: telegramUrl,
    twitter: twitterUsername ? `https://twitter.com/${twitterUsername}` : ''
  }

  if (!collection || !chartData) {
    return <LocalLoader fill="true" />
  }

  const marketCapUSD = (
    <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#4f8fea'}>
      {formattedNum(collection.statistic.marketCapUSD, '$')}
    </TYPE.main>
  )

  const totalVolumeUSD = (
    <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#fd3c99'}>
      {formattedNum(collection.statistic.totalVolumeUSD, '$')}
    </TYPE.main>
  )

  return (
    <PageWrapper>
      <ThemedBackground backgroundColor={transparentize(0.6, backgroundColor)} />
      <ContentWrapper>
        <DashboardWrapper>
          <Header address={address} below1024={below1024} logo={logo} name={name} />
          <PanelWrapper>
            <Section title="Market Cap" content={marketCapUSD} />
            <Section title="Total Volume" content={totalVolumeUSD} />
            <Section title="Links" content={<Links logo={logo} links={links} />} />
            <Panel
              sx={{
                gridColumn: ['1', '1', '1', '2/4'],
                gridRow: ['', '', '', '1/4']
              }}
            >
              <GlobalNFTChart chartData={chartData} />
            </Panel>
          </PanelWrapper>
          <>
            <RowBetween style={{ marginTop: '3rem' }}>
              <TYPE.main fontSize={'1.125rem'}>Description</TYPE.main>{' '}
            </RowBetween>
            <Panel
              rounded
              style={{
                marginTop: '1.5rem'
              }}
              p={20}
            >
              <DetailsLayout>
                <TYPE.main fontSize={'15px'} lineHeight={1.25} fontWeight={500}>
                  {description}
                </TYPE.main>
              </DetailsLayout>
            </Panel>
          </>
        </DashboardWrapper>
      </ContentWrapper>
    </PageWrapper>
  )
}

export default NFTCollectionPage
