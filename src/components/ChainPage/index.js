import React, { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import { transparentize } from 'polished'

import { AutoRow, RowBetween, RowFlat, RowFixed } from '../Row'
import { AutoColumn } from '../Column'
import Search from '../Search'
import Panel from '../Panel'
import { PageWrapper, ContentWrapper } from '..'
import Filters from '../Filters'
import { AllTvlOptions } from '../SettingsModal'

import { useDarkModeManager, useGetExtraTvlEnabled } from 'contexts/LocalStorage'
import { TYPE, ThemedBackground } from 'Theme'
import { formattedNum, getPercentChange, getPrevTvlFromChart, getTokenDominance } from 'utils'
import { useCalcStakePool2Tvl } from 'hooks/data'
import { DownloadCloud } from 'react-feather'
import { BasicLink } from '../Link'

import { chainCoingeckoIds } from 'constants/chainTokens'
import { useDenominationPriceHistory } from 'utils/dataApi'
import SEO from '../SEO'
import { OptionButton } from 'components/ButtonStyled'
import { useRouter } from 'next/router'
import LocalLoader from 'components/LocalLoader'
import llamaLogo from '../../assets/peeking-llama.png'
import Image from 'next/image'
import Table, { columnsToShow } from 'components/Table'

const ListOptions = styled(AutoRow)`
  height: 40px;
  width: 100%;
  font-size: 1.25rem;
  font-weight: 600;
  @media screen and (max-width: 640px) {
    font-size: 1rem;
  }
`

export const BreakpointPanels = styled.div`
  @media screen and (min-width: 800px) {
    width: 100%;
    display: flex;
    padding: 0;
    align-items: stretch;
  }
`

const FiltersRow = styled(RowFlat)`
  @media screen and (min-width: 800px) {
    width: calc(100% - 90px);
  }
`

export const BreakpointPanelsColumn = styled(AutoColumn)`
  width: 100%;
  margin-right: 10px;
  max-width: 350px;
  @media (max-width: 800px) {
    max-width: initial;
    margin-bottom: 10px;
  }
`

const DownloadIcon = styled(DownloadCloud)`
  color: ${({ theme }) => theme.text1};
`

const Chart = dynamic(() => import('components/GlobalChart'), {
  ssr: false,
})

const Game = dynamic(() => import('game'))

const BASIC_DENOMINATIONS = ['USD']

const setSelectedChain = (newSelectedChain) => (newSelectedChain === 'All' ? '/' : `/chain/${newSelectedChain}`)

const columns = columnsToShow('protocolName', 'chains', '1dChange', '7dChange', '1mChange', 'tvl', 'mcaptvl')

function GlobalPage({ selectedChain = 'All', chainsSet, filteredProtocols, chart, extraVolumesCharts = {} }) {
  const extraTvlsEnabled = useGetExtraTvlEnabled()

  const router = useRouter()

  const denomination = router.query?.currency ?? 'USD'

  const [easterEgg, setEasterEgg] = useState(false)
  const [darkMode, toggleDarkMode] = useDarkModeManager()
  const activateEasterEgg = () => {
    if (easterEgg) {
      if (!darkMode) {
        toggleDarkMode()
      }
      window.location.reload()
    } else {
      if (darkMode) {
        toggleDarkMode()
      }
      setEasterEgg(true)
    }
  }

  const hour = new Date().getHours()
  const isDegen = hour >= 1 && hour <= 6

  const { totalVolumeUSD, volumeChangeUSD, globalChart } = useMemo(() => {
    const globalChart = chart.map((data) => {
      let sum = data[1]
      Object.entries(extraVolumesCharts).forEach(([prop, propCharts]) => {
        const stakedData = propCharts.find((x) => x[0] === data[0])
        if (stakedData) {
          if (prop === 'doublecounted') {
            sum -= stakedData[1]
          }

          if (extraTvlsEnabled[prop.toLowerCase()]) {
            sum += stakedData[1]
          }
        }
      })
      return [data[0], sum]
    })

    const tvl = getPrevTvlFromChart(globalChart, 0)
    const tvlPrevDay = getPrevTvlFromChart(globalChart, 1)
    const volumeChangeUSD = getPercentChange(tvl, tvlPrevDay)

    return { totalVolumeUSD: tvl, volumeChangeUSD, globalChart }
  }, [chart, extraTvlsEnabled, extraVolumesCharts])

  let chainOptions = ['All'].concat(chainsSet).map((label) => ({ label, to: setSelectedChain(label) }))

  const protocolTotals = useCalcStakePool2Tvl(filteredProtocols)

  const topToken = { name: 'Uniswap', tvl: 0 }
  if (protocolTotals.length > 0) {
    topToken.name = protocolTotals[0]?.name
    topToken.tvl = protocolTotals[0]?.tvl
    if (topToken.name === 'AnySwap') {
      topToken.name = protocolTotals[1]?.name
      topToken.tvl = protocolTotals[1]?.tvl
    }
  }

  const tvl = formattedNum(totalVolumeUSD, true)

  const percentChange = volumeChangeUSD?.toFixed(2)

  const volumeChange = (percentChange > 0 ? '+' : '') + percentChange + '%'

  const [DENOMINATIONS, chainGeckoId] = useMemo(() => {
    let DENOMINATIONS = []
    let chainGeckoId = null
    if (selectedChain !== 'All') {
      let chainDenomination = chainCoingeckoIds[selectedChain] ?? null

      chainGeckoId = chainDenomination?.geckoId ?? null

      if (chainGeckoId && chainDenomination.symbol) {
        DENOMINATIONS = [...BASIC_DENOMINATIONS, chainDenomination.symbol]
      }
    }
    return [DENOMINATIONS, chainGeckoId]
  }, [selectedChain])

  const { data: denominationPriceHistory, loading } = useDenominationPriceHistory(chainGeckoId, 0)

  const [finalChartData, chainPriceInUSD] = useMemo(() => {
    if (denomination !== 'USD' && denominationPriceHistory && chainGeckoId) {
      let priceIndex = 0
      let prevPriceDate = 0
      const denominationPrices = denominationPriceHistory.prices
      const newChartData = []
      let priceInUSD = 1
      for (let i = 0; i < globalChart.length; i++) {
        const date = globalChart[i][0] * 1000
        while (
          priceIndex < denominationPrices.length &&
          Math.abs(date - prevPriceDate) > Math.abs(date - denominationPrices[priceIndex][0])
        ) {
          prevPriceDate = denominationPrices[priceIndex][0]
          priceIndex++
        }
        priceInUSD = denominationPrices[priceIndex - 1][1]
        newChartData.push([globalChart[i][0], globalChart[i][1] / priceInUSD])
      }
      return [newChartData, priceInUSD]
    } else return [globalChart, 1]
  }, [chainGeckoId, globalChart, denominationPriceHistory, denomination])

  const updateRoute = (unit) => {
    router.push({
      query: {
        ...router.query,
        currency: unit,
      },
    })
  }

  const totalVolume = totalVolumeUSD / chainPriceInUSD

  const dominance = getTokenDominance(topToken, totalVolume)

  const isLoading = denomination !== 'USD' && loading

  const panels = (
    <>
      <Panel style={{ padding: '18px 25px', justifyContent: 'center' }}>
        <AutoColumn gap="4px">
          <RowBetween>
            <TYPE.heading>Total Value Locked (USD)</TYPE.heading>
          </RowBetween>
          <RowBetween style={{ marginTop: '4px', marginBottom: '-6px' }} align="flex-end">
            <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#4f8fea'}>
              {tvl}
            </TYPE.main>
            <BasicLink
              href={`https://api.llama.fi/simpleChainDataset/${selectedChain}?${Object.entries(extraTvlsEnabled)
                .filter((t) => t[1] === true)
                .map((t) => `${t[0]}=true`)
                .join('&')}`}
            >
              <DownloadIcon />
            </BasicLink>
          </RowBetween>
        </AutoColumn>
      </Panel>
      <Panel style={{ padding: '18px 25px', justifyContent: 'center' }}>
        <AutoColumn gap="4px">
          <RowBetween>
            <TYPE.heading>Change (24h)</TYPE.heading>
          </RowBetween>
          <RowBetween style={{ marginTop: '4px', marginBottom: '-6px' }} align="flex-end">
            <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#fd3c99'}>
              {percentChange || 0}%
            </TYPE.main>
          </RowBetween>
        </AutoColumn>
      </Panel>
      <Panel style={{ padding: '18px 25px', justifyContent: 'center' }}>
        <AutoColumn gap="4px">
          <RowBetween>
            <TYPE.heading>{topToken.name} Dominance</TYPE.heading>
          </RowBetween>
          <RowBetween style={{ marginTop: '4px', marginBottom: '-6px' }} align="flex-end">
            <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#46acb7'}>
              {dominance}%
            </TYPE.main>
          </RowBetween>
        </AutoColumn>
      </Panel>
    </>
  )

  return (
    <PageWrapper>
      <SEO cardName={selectedChain} chain={selectedChain} tvl={tvl} volumeChange={volumeChange} />
      <ThemedBackground backgroundColor={transparentize(0.8, '#445ed0')} />
      <ContentWrapper>
        <AutoColumn gap="24px">
          <Search />
        </AutoColumn>
        <div>
          <BreakpointPanels>
            <BreakpointPanelsColumn gap="10px">{panels}</BreakpointPanelsColumn>
            <Panel style={{ height: '100%', minHeight: '347px', width: '100%' }}>
              <RowFixed>
                {DENOMINATIONS.map((option) => (
                  <OptionButton
                    active={denomination === option}
                    onClick={() => updateRoute(option)}
                    style={{ margin: '0 8px 8px 0' }}
                    key={option}
                  >
                    {option}
                  </OptionButton>
                ))}
              </RowFixed>
              {easterEgg ? (
                <Game />
              ) : isLoading ? (
                <LocalLoader style={{ margin: 'auto' }} />
              ) : (
                <Chart
                  display="liquidity"
                  dailyData={finalChartData}
                  unit={denomination}
                  totalLiquidity={totalVolume}
                  liquidityChange={volumeChangeUSD}
                />
              )}
            </Panel>
          </BreakpointPanels>
          {isDegen && (
            <div
              style={{
                marginTop: '0px',
                marginBottom: '-34px',
              }}
            >
              <Image src={llamaLogo} width={41} height={34} onClick={activateEasterEgg} alt="" />
            </div>
          )}
        </div>

        <AllTvlOptions style={{ display: 'flex', justifyContent: 'center' }} />
        <ListOptions gap="10px" style={{ marginBottom: '.5rem' }}>
          <RowBetween>
            <TYPE.main sx={{ minWidth: '90px' }} fontSize={'1.125rem'}>
              TVL Rankings
            </TYPE.main>
            <FiltersRow>
              <Filters filterOptions={chainOptions} activeLabel={selectedChain} justify="end" />
            </FiltersRow>
          </RowBetween>
        </ListOptions>
        <Table data={protocolTotals} columns={columns} />
      </ContentWrapper>
    </PageWrapper>
  )
}

export default GlobalPage
