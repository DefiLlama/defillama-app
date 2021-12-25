import React from 'react'
import styled from 'styled-components'
import { transparentize } from 'polished'
import { useMedia } from 'react-use'
import { Text, Box } from 'rebass'
import dynamic from 'next/dynamic'

import Header from './Header'
import Section from './Section'
import Links from './Links'

import Link, { BasicLink } from 'components/Link'
import Search from 'components/Search'
import { formattedNum, capitalizeFirstLetter } from '../../utils'
import { AutoRow, RowBetween } from '../../components/Row'
import { PageWrapper, ContentWrapper } from '../../components'
import Panel from '../../components/Panel'
import { TYPE, ThemedBackground } from '../../Theme'
import { useProtocolColor } from 'hooks'
import { chainCoingeckoIds } from '../../constants/chainTokens'
import LocalLoader from 'components/LocalLoader'
import { useHideLastDayManager } from '../../contexts/LocalStorage'

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

const HiddenSearch = styled.span`
  @media screen and (max-width: ${({ theme }) => theme.bpSm}) {
    display: none;
  }
`

const GlobalNFTChart = dynamic(() => import('../GlobalNFTChart'), {
  ssr: false
})

function NFTCollectionPage({ collection, chartData }) {
  const [hideLastDay] = useHideLastDayManager()
  const below1024 = useMedia('(max-width: 1024px)')

  const { chains, address, description, logo, name, slug, website, twitterUsername, discordUrl, telegramUrl } =
    collection || {}

  const backgroundColor = useProtocolColor({ protocol: slug, logo, transparent: false })

  const symbol = chainCoingeckoIds[capitalizeFirstLetter(chains?.length && chains[0])]?.symbol
  let dailyVolume = chartData.length ? chartData[chartData.length - 1].dailyVolume : 0 //TODO Return from backend

  const links = {
    website,
    discord: discordUrl,
    telegram: telegramUrl,
    twitter: twitterUsername ? `https://twitter.com/${twitterUsername}` : ''
  }

  if (!collection || !chartData) {
    return <LocalLoader fill="true" />
  }

  if (hideLastDay) {
    chartData = chartData.slice(0, -1)
    if (chartData.length > 1) {
      dailyVolume = chartData[chartData.length - 1].dailyVolume
    }
  }

  const marketCapUSD = (
    <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#4f8fea'}>
      {formattedNum(collection.marketCapUSD, '$')}
    </TYPE.main>
  )

  const totalVolumeUSD = (
    <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#fd3c99'}>
      {formattedNum(collection.totalVolumeUSD, '$')}
    </TYPE.main>
  )

  return (
    <PageWrapper>
      <ThemedBackground backgroundColor={transparentize(0.6, backgroundColor)} />
      <ContentWrapper>
        <RowBetween flexWrap="wrap">
          <AutoRow align="flex-end" style={{ width: 'fit-content' }}>
            <TYPE.body>
              <BasicLink href="/nfts">{'Collections '}</BasicLink>→{' '}
            </TYPE.body>
            <Link style={{ width: 'fit-content' }} color={backgroundColor} external href="#">
              <Text style={{ marginLeft: '.15rem' }} fontSize={'14px'} fontWeight={400}>
                {name}
              </Text>
            </Link>
          </AutoRow>
          <HiddenSearch>
            <Search small={true} />
          </HiddenSearch>
        </RowBetween>
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
              <GlobalNFTChart chartData={chartData} dailyVolume={dailyVolume} symbol={symbol} />
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
