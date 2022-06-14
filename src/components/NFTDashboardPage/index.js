import React, { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { transparentize } from 'polished'
import { useDisplayUsdManager, useHideLastDayManager } from '../../contexts/LocalStorage'
import Filters from '../Filters'
import { CheckMarks } from '../SettingsModal'
import { NFTsSearch } from '../Search/New'
import NFTCollectionList from '../NFTCollectionList'
import { formattedNum } from '../../utils'
import { chainCoingeckoIds, chainMarketplaceMappings } from '../../constants/chainTokens'
import SEO from 'components/SEO'
import { BreakpointPanel, BreakpointPanels, ChartAndValuesWrapper, Panel } from 'components'
import { ListHeader, ListOptions } from 'components/ChainPage'
import Layout from 'layout'
import { useMedia } from 'hooks'

const defaultTab = {
  label: 'All',
  to: '/nfts',
}

const GlobalNFTChart = dynamic(() => import('../GlobalNFTChart'), {
  ssr: false,
})

const NFTDashboard = ({ title, statistics, collections, chart, chainData, marketplaceData, displayName = 'All' }) => {
  useEffect(() => window.scrollTo(0, 0))

  const { totalVolume, totalVolumeUSD, dailyVolume, dailyVolumeUSD, dailyChange } = statistics
  const [hideLastDay] = useHideLastDayManager()
  const below800 = useMedia('(max-width: 800px)')

  const isChain = chainData ? true : false
  const selectedTab = displayName
  const setSelectedTab = (newSelectedTab) =>
    isChain ? `/nfts/chain/${newSelectedTab}` : `/nfts/marketplace/${newSelectedTab}`

  let tabOptions = [
    defaultTab,
    ...(chainData || marketplaceData)
      ?.sort((a, b) => parseInt(b.totalVolumeUSD) - parseInt(a.totalVolumeUSD))
      ?.map((option) => ({
        label: option.displayName,
        to: isChain ? setSelectedTab(option.chain) : setSelectedTab(option.marketplace),
      })),
  ]

  let shownTotalVolume, shownDailyVolume, shownDailyChange, symbol, unit
  let [displayUsd] = useDisplayUsdManager()

  const isHomePage = selectedTab === 'All'
  if (isHomePage || displayUsd) {
    ;[shownTotalVolume, shownDailyVolume, shownDailyChange, symbol, unit] = [
      totalVolumeUSD,
      dailyVolumeUSD,
      dailyChange,
      'USD',
      '$',
    ]
    displayUsd = true
  } else {
    ;[shownTotalVolume, shownDailyVolume, shownDailyChange, symbol, unit] = [
      totalVolume,
      dailyVolume,
      dailyChange,
      isChain
        ? chainCoingeckoIds[selectedTab]?.symbol
        : chainCoingeckoIds[chainMarketplaceMappings[selectedTab]]?.symbol,
      '',
    ]
  }

  if (hideLastDay) {
    if (chart.length >= 3 && displayUsd) {
      ;[shownTotalVolume, shownDailyVolume, shownDailyChange] = [
        totalVolumeUSD - chart[chart.length - 1].volumeUSD,
        chart[chart.length - 2].volumeUSD,
        ((chart[chart.length - 2].volumeUSD - chart[chart.length - 3].volumeUSD) / chart[chart.length - 3].volumeUSD) *
          100,
      ]
      chart = chart.slice(0, -1)
    } else if (chart.length >= 3) {
      ;[shownTotalVolume, shownDailyVolume, shownDailyChange] = [
        totalVolume - chart[chart.length - 1].volume,
        chart[chart.length - 2].volume,
        ((chart[chart.length - 2].volume - chart[chart.length - 3].volume) / chart[chart.length - 3].volume) * 100,
      ]
      chart = chart.slice(0, -1)
    }
  }

  const tvl = formattedNum(totalVolumeUSD, true)

  return (
    <Layout title={title} backgroundColor={transparentize(0.8, '#445ed0')}>
      <SEO cardName={displayName} chain={displayName} tvl={tvl} nftPage />

      <NFTsSearch />
      <Panel as="p" style={{ textAlign: 'center', margin: '0', display: 'block' }}>
        Data is currently incorrect and we are fixing it, please don't use it
      </Panel>
      <CheckMarks type="nfts" />

      <ChartAndValuesWrapper>
        <BreakpointPanels>
          <BreakpointPanel>
            <h1>Total Volume</h1>
            <p style={{ '--tile-text-color': '#4f8fea' }}>{formattedNum(shownTotalVolume, displayUsd)}</p>
          </BreakpointPanel>
          <BreakpointPanel>
            <h2>Daily Volume</h2>
            <p style={{ '--tile-text-color': '#fd3c99' }}>{formattedNum(shownDailyVolume, displayUsd)}</p>
          </BreakpointPanel>
          <BreakpointPanel>
            <h2>Change (24h)</h2>
            <p style={{ '--tile-text-color': '#46acb7' }}>{shownDailyChange?.toFixed(2)}%</p>
          </BreakpointPanel>
        </BreakpointPanels>
        <BreakpointPanel id="chartWrapper">
          <GlobalNFTChart
            chartData={chart}
            dailyVolume={shownDailyVolume}
            dailyVolumeChange={shownDailyChange}
            symbol={symbol}
            unit={unit}
            displayUsd={displayUsd}
          />
        </BreakpointPanel>
      </ChartAndValuesWrapper>

      <ListOptions>
        <ListHeader>NFT Rankings</ListHeader>
        <Filters filterOptions={tabOptions} activeLabel={selectedTab} />
      </ListOptions>

      <Panel style={{ padding: below800 && '1rem 0 0 0 ' }}>
        <NFTCollectionList collections={collections} displayUsd={displayUsd} />
      </Panel>
    </Layout>
  )
}

export default NFTDashboard
