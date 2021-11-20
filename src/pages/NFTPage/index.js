import React from 'react'
import { Redirect } from 'react-router-dom'
import { transparentize } from 'polished'
import { useMedia } from 'react-use'

import Header from './Header'
import Section from './Section'
import Links from './Links'

import { formattedNum } from '../../utils'

import { AutoRow, RowBetween, RowFixed } from '../../components/Row'
import Chart from '../../components/Chart'
import { DetailsLayout, DashboardWrapper, PanelWrapper } from '../shared'
import FormattedName from '../../components/FormattedName'
import { Hover, PageWrapper, ContentWrapper, StyledIcon } from '../../components'
import Panel from '../../components/Panel'
import { TYPE, ThemedBackground } from '../../Theme'
import { useCollectionChartData, useNFTCollection } from 'contexts/NFTData'
import LocalLoader from 'components/LocalLoader'
import { useColor } from 'hooks'
import GlobalNFTChart from 'components/GlobalNFTChart'

export default function NFTPage({ slug }) {
  const below1600 = useMedia('(max-width: 1600px)')
  const below1024 = useMedia('(max-width: 1024px)')
  const below800 = useMedia('(max-width: 800px)')
  const below600 = useMedia('(max-width: 600px)')
  const below500 = useMedia('(max-width: 500px)')
  const below850 = useMedia('(max-width: 850px)')

  const { collection, error } = useNFTCollection(slug)
  const chartData = useCollectionChartData(slug)
  const {
    address,
    description,
    logo,
    name,
    website,
    twitterUsername,
    discordUrl,
    telegramUrl
  } = collection || {}

  const backgroundColor = useColor(null, null, logo)

  const links = {
    website,
    discord: discordUrl,
    telegram: telegramUrl,
    twitter: twitterUsername ? `https://twitter.com/${twitterUsername}` : "",
  }

  if (error) {
    return <Redirect to="/nfts" />
  }

  if (!collection || !chartData) {
    return(<LocalLoader fill="true" />)
  }

  const marketCapUSD =
    <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#4f8fea'}>
      {formattedNum(collection.statistic.marketCapUSD, "$")}
    </TYPE.main>

  const totalVolumeUSD =
    <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#fd3c99'}>
      {formattedNum(collection.statistic.totalVolumeUSD, "$")}
    </TYPE.main>

  return(
    <PageWrapper>
      <ThemedBackground backgroundColor={transparentize(0.6, backgroundColor)} />
      <ContentWrapper>
        <DashboardWrapper style={{ marginTop: below1024 ? '0' : '1rem' }}>
          <Header address={address} below1024={below1024} logo={logo} name={name} />
          <PanelWrapper>
            <Section title="Market Cap" content={marketCapUSD} />
            <Section title="Total Volume" content={totalVolumeUSD} />
            <Section title="Links" content={<Links logo={logo} links={links} />} />

            <Panel style={{ gridColumn: below1024 ? '1' : '2/4', gridRow: below1024 ? '' : '1/4' }}>
              <GlobalNFTChart collectionData={chartData} />
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