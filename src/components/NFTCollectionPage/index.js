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
import Column from '../../components/Column'
import HeadHelp from '../../components/HeadHelp'
import CopyHelper from '../../components/Copy'
import { PageWrapper, ContentWrapper } from '../../components'
import Panel from '../../components/Panel'
import { TYPE, ThemedBackground } from '../../Theme'
import { useProtocolColor } from 'hooks'
import { chainCoingeckoIds } from '../../constants/chainTokens'
import LocalLoader from 'components/LocalLoader'
import { useHideLastDayManager, useDisplayUsdManager } from '../../contexts/LocalStorage'
import SEO from 'components/SEO'

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
  ssr: false,
})

function NFTCollectionPage({ collection, chart, statistics }) {
  const [hideLastDay] = useHideLastDayManager()
  const [displayUsd] = useDisplayUsdManager()
  const below1024 = useMedia('(max-width: 1024px)')

  const {
    chains,
    address,
    description,
    logo,
    name,
    slug,
    website,
    discord_url,
    telegram_url,
    twitter_username,
    medium_username,
    marketCap,
    marketCapUSD,
    updatedAt,
  } = collection || {}

  const { totalVolume, totalVolumeUSD, dailyVolume, dailyVolumeUSD, dailyChange } = statistics || {}

  const backgroundColor = useProtocolColor({ protocol: slug, logo, transparent: false })

  const links = {
    website: website || '',
    discord: discord_url || '',
    telegram: telegram_url || '',
    medium: medium_username ? `https://medium.com/${medium_username}` : '',
    twitter: twitter_username ? `https://twitter.com/${twitter_username}` : '',
  }

  if (!collection || !chart) {
    return <LocalLoader fill="true" />
  }

  let shownMarketCap, shownTotalVolume, shownDailyVolume, shownDailyChange, symbol, unit

  if (displayUsd) {
    ;[shownMarketCap, shownTotalVolume, shownDailyVolume, shownDailyChange, symbol, unit] = [
      marketCapUSD,
      totalVolumeUSD,
      dailyVolumeUSD,
      dailyChange,
      'USD',
      '$',
    ]
  } else {
    ;[shownMarketCap, shownTotalVolume, shownDailyVolume, shownDailyChange, symbol, unit] = [
      marketCap,
      totalVolume,
      dailyVolume,
      dailyChange,
      chainCoingeckoIds[capitalizeFirstLetter(chains?.length && chains[0])]?.symbol,
      '',
    ]
  }

  if (hideLastDay) {
    if (chart.length >= 2 && displayUsd) {
      shownTotalVolume = totalVolumeUSD - chart[chart.length - 1].volumeUSD
      shownDailyVolume = chart[chart.length - 2].volumeUSD
      shownDailyChange =
        ((chart[chart.length - 2].volumeUSD - chart[chart.length - 3].volumeUSD) / chart[chart.length - 3].volumeUSD) *
        100
      chart = chart.slice(0, -1)
    } else if (chart.length >= 2) {
      shownTotalVolume = totalVolume - chart[chart.length - 1].volume
      shownDailyVolume = chart[chart.length - 2].volume
      shownDailyChange =
        ((chart[chart.length - 2].volume - chart[chart.length - 3].volume) / chart[chart.length - 3].volume) * 100
      chart = chart.slice(0, -1)
    }
  }

  const marketCapSection = (
    <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#4f8fea'}>
      {shownMarketCap ? formattedNum(shownMarketCap, displayUsd) : '-'}
    </TYPE.main>
  )

  const totalVolumeSection = (
    <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#fd3c99'}>
      {formattedNum(shownTotalVolume, displayUsd)}
    </TYPE.main>
  )

  return (
    <PageWrapper>
      <SEO cardName={name} logo={logo} nftPage />
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
            <Section title="Market Cap" content={marketCapSection} />
            <Section title="Total Volume" content={totalVolumeSection} />
            <Section title="Links" content={<Links logo={logo} links={links} />} />
            <Panel
              sx={{
                gridColumn: ['1', '1', '1', '2/4'],
                gridRow: ['', '', '', '1/4'],
              }}
            >
              <GlobalNFTChart
                chartData={chart}
                dailyVolume={shownDailyVolume}
                dailyVolumeChange={shownDailyChange}
                symbol={symbol}
                unit={unit}
                displayUsd={displayUsd}
              />
            </Panel>
          </PanelWrapper>
          <>
            <RowBetween style={{ marginTop: '3rem' }}>
              <TYPE.main fontSize={'1.125rem'}>Description</TYPE.main>{' '}
            </RowBetween>
            <Panel
              rounded
              style={{
                marginTop: '1.5rem',
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
          <RowBetween style={{ marginTop: '3rem' }}>
            <TYPE.main fontSize={'1.125rem'}>Collection Information</TYPE.main>{' '}
          </RowBetween>
          <Panel
            rounded
            style={{
              marginTop: '1.5rem',
            }}
            p={20}
          >
            <AutoRow align="flex-end">
              <Column>
                <TYPE.main>
                  <HeadHelp
                    title="Address"
                    text="The majority of collection addresses are fetched automatically from marketplace APIs and may be inaccurate. Always verify that the collection address is correct."
                  />
                </TYPE.main>
                <AutoRow align="flex-end">
                  <TYPE.main style={{ marginTop: '.5rem' }} fontSize={24} fontWeight="500">
                    {address ? address.slice(0, 8) + '...' + address?.slice(36, 42) : '-'}
                  </TYPE.main>
                  <CopyHelper toCopy={address || '-'} />
                </AutoRow>
              </Column>
              <Column>
                <TYPE.main>Last fetched</TYPE.main>
                <AutoRow align="flex-end">
                  <TYPE.main style={{ marginTop: '.5rem' }} fontSize={24} fontWeight="500">
                    {updatedAt ? new Date(updatedAt).toDateString() : '-'}
                  </TYPE.main>
                </AutoRow>
              </Column>
            </AutoRow>
          </Panel>
        </DashboardWrapper>
      </ContentWrapper>
    </PageWrapper>
  )
}

export default NFTCollectionPage
