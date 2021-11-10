import React, { useEffect, useState, useMemo, lazy, Suspense } from 'react'
import { withRouter, Redirect } from 'react-router-dom'
import { useMedia } from 'react-use'
import styled from 'styled-components'
import { transparentize } from 'polished'

import { AutoRow, RowBetween, RowFlat } from 'components/Row'
import Loader from 'components/LocalLoader'
import { AutoColumn } from 'components/Column'
import TokenList from 'components/TokenList'
import Search from 'components/Search'
import Panel from 'components/Panel'
import { CustomLink } from 'components/Link'
import { PageWrapper, ContentWrapper } from 'components'
import Filters from 'components/Filters'
import RightSettings from 'components/RightSettings'
import { CheckMarks } from 'components/SettingsModal'

import { TYPE, ThemedBackground } from 'Theme'

import { useGlobalData } from 'contexts/GlobalData'
import { useAllTokenData } from 'contexts/TokenData'
import { useStakingManager, usePool2Manager } from 'contexts/LocalStorage'
import { fetchAPI } from 'contexts/API'
import { CHART_API } from 'constants/index'
import { priorityChainFilters } from 'constants/chainTokens'
import { formattedNum } from 'utils'

const ProtocolChart = lazy(() => import('components/ProtocolChart'))
const GlobalChart = lazy(() => import('components/GlobalChart'))

const ListOptions = styled(AutoRow)`
  height: 40px;
  width: 100%;
  font-size: 1.25rem;
  font-weight: 600;

  @media screen and (max-width: 640px) {
    font-size: 1rem;
  }
`

function GlobalPage({ selectedChain = 'All', denomination }) {
  const allChains = selectedChain === 'All'
  // get data for lists and totals
  let allTokensOriginal = useAllTokenData()
  //const transactions = useGlobalTransactions()
  const globalData = useGlobalData()
  const [chainChartData, setChainChartData] = useState({})
  const setSelectedChain = newSelectedChain => (newSelectedChain === 'All' ? '/' : `/chain/${newSelectedChain}`)
  // breakpoints
  const below800 = useMedia('(max-width: 800px)')
  // scrolling refs
  useEffect(() => {
    document.querySelector('body').scrollTo({
      behavior: 'smooth',
      top: 0
    })
  }, [])
  const [stakingEnabled] = useStakingManager()
  const [pool2Enabled] = usePool2Manager()

  let { totalVolumeUSD, volumeChangeUSD } = globalData

  useEffect(() => {
    if (selectedChain !== undefined && chainChartData[selectedChain] === undefined) {
      fetchAPI(`${CHART_API}/${selectedChain}`).then(chart =>
        setChainChartData({
          [selectedChain]: chart
        })
      )
    }
  }, [selectedChain])

  if (!allChains) {
    const chartData = chainChartData[selectedChain]
    if (chartData === undefined) {
      totalVolumeUSD = 0
      volumeChangeUSD = 0
    } else {
      totalVolumeUSD = chartData[chartData.length - 1].totalLiquidityUSD
      if (chartData.length > 1) {
        volumeChangeUSD =
          ((chartData[chartData.length - 1].totalLiquidityUSD - chartData[chartData.length - 2].totalLiquidityUSD) /
            chartData[chartData.length - 2].totalLiquidityUSD) *
          100
      } else {
        volumeChangeUSD = 0
      }
    }
  }

  const [tokensList, chainsSet] = useMemo(() => {
    const chainsSet = new Set(priorityChainFilters)

    let filteredTokens = Object.values(allTokensOriginal)
      .map(token => {
        if (token.category === 'Chain') {
          return null
        }
        token.chains.forEach(chain => {
          chainsSet.add(chain)
        })
        if (!allChains) {
          if (token.chains.length === 1) {
            if (token.chains[0] !== selectedChain) {
              return null
            }
          } else {
            const chainTvl = token.chainTvls[selectedChain]
            if (chainTvl === undefined) {
              return null
            }
            return {
              ...token,
              tvl: chainTvl
            }
          }
        }
        return {
          ...token,
          mcaptvl: token.tvl !== 0 && token.mcap ? token.mcap / token.tvl : null,
          fdvtvl: token.tvl !== 0 && token.fdv ? token.fdv / token.tvl : null
        }
      })
      .filter(token => token !== null)

    if (selectedChain !== 'All' || stakingEnabled || pool2Enabled) {
      filteredTokens = filteredTokens.sort((a, b) => b.tvl - a.tvl)
    }

    return [filteredTokens, chainsSet]
  }, [allTokensOriginal, selectedChain, stakingEnabled, pool2Enabled])

  let chainOptions = [...chainsSet].map(label => ({ label, to: setSelectedChain(label) }))

  if (allChains && (stakingEnabled || pool2Enabled)) {
    tokensList.forEach(token => {
      if (token.staking && stakingEnabled) {
        totalVolumeUSD += token.staking
      }
      if (token.pool2 && pool2Enabled) {
        totalVolumeUSD += token.pool2
      }
    })
  }

  const topToken = { name: 'Uniswap', tvl: 0 }
  if (tokensList.length > 0) {
    topToken.name = tokensList[0]?.name
    topToken.tvl = tokensList[0]?.tvl
    if (topToken.name === 'AnySwap') {
      topToken.name = tokensList[1]?.name
      topToken.tvl = tokensList[1]?.tvl
    }
  } else {
    return <Redirect to="/" />
  }

  document.title = `DefiLlama - DeFi Dashboard`

  const chart = (
    <Suspense fallback={<Loader />}>
      {allChains ? (
        <GlobalChart display="liquidity" />
      ) : chainChartData[selectedChain] !== undefined ? (
        <ProtocolChart chartData={chainChartData[selectedChain]} protocol={selectedChain} denomination={denomination} />
      ) : (
        <Loader />
      )}
    </Suspense>
  )

  return (
    <PageWrapper>
      <ThemedBackground backgroundColor={transparentize(0.8, '#445ed0')} />
      <ContentWrapper>
        <div>
          <AutoColumn gap="24px" style={{ paddingBottom: below800 ? '0' : '24px' }}>
            <RowBetween>
              <TYPE.largeHeader>Defi Dashboard</TYPE.largeHeader>
              {!below800 && <RightSettings />}
            </RowBetween>
            <Search />
            {selectedChain === 'Fantom' && (
              <Panel background={true} style={{ textAlign: 'center' }}>
                <TYPE.main fontWeight={400}>
                  AnySwap TVL has been excluded from the total TVL calculation. Click{' '}
                  <a
                    style={{ color: 'inherit', fontWeight: '700' }}
                    href="https://twitter.com/0xngmi/status/1446691628043878404"
                  >
                    here
                  </a>{' '}
                  for our explanation and reasoning
                </TYPE.main>
              </Panel>
            )}
            <CheckMarks />
          </AutoColumn>
          {below800 && ( // mobile card
            <AutoColumn
              style={{
                height: '100%',
                width: '100%',
                marginRight: '10px',
                marginTop: '10px'
              }}
              gap="10px"
            >
              <Panel style={{ padding: '18px 25px' }}>
                <AutoColumn gap="4px">
                  <RowBetween>
                    <TYPE.heading>Total Value Locked(USD)</TYPE.heading>
                  </RowBetween>
                  <RowBetween style={{ marginTop: '4px', marginBottom: '4px' }} align="flex-end">
                    <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#4f8fea'}>
                      {formattedNum(totalVolumeUSD, true)}
                    </TYPE.main>
                  </RowBetween>
                </AutoColumn>
              </Panel>
              <Panel style={{ padding: '18px 25px' }}>
                <AutoColumn gap="4px">
                  <RowBetween>
                    <TYPE.heading>Change (24h)</TYPE.heading>
                  </RowBetween>
                  <RowBetween style={{ marginTop: '4px', marginBottom: '4px' }} align="flex-end">
                    <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#fd3c99'}>
                      {volumeChangeUSD?.toFixed(2)}%
                    </TYPE.main>
                  </RowBetween>
                </AutoColumn>
              </Panel>
              <Panel style={{ padding: '18px 25px' }}>
                <AutoColumn gap="4px">
                  <RowBetween>
                    <TYPE.heading>{topToken.name} Dominance</TYPE.heading>
                  </RowBetween>
                  <RowBetween style={{ marginTop: '4px', marginBottom: '4px' }} align="flex-end">
                    <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#46acb7'}>
                      {((topToken.tvl / totalVolumeUSD) * 100.0).toFixed(2)}%
                    </TYPE.main>
                  </RowBetween>
                </AutoColumn>
              </Panel>
            </AutoColumn>
          )}
          {!below800 && (
            <AutoRow>
              <AutoColumn
                style={{
                  height: '100%',
                  width: '100%',
                  maxWidth: '350px',
                  marginRight: '10px'
                }}
                gap="10px"
              >
                <Panel style={{ padding: '18px 25px' }}>
                  <AutoColumn gap="4px">
                    <RowBetween>
                      <TYPE.heading>Total Value Locked (USD)</TYPE.heading>
                    </RowBetween>
                    <RowBetween style={{ marginTop: '4px', marginBottom: '4px' }} align="flex-end">
                      <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#4f8fea'}>
                        {formattedNum(totalVolumeUSD, true)}
                      </TYPE.main>
                    </RowBetween>
                  </AutoColumn>
                </Panel>
                <Panel style={{ padding: '18px 25px' }}>
                  <AutoColumn gap="4px">
                    <RowBetween>
                      <TYPE.heading>Change (24h)</TYPE.heading>
                    </RowBetween>
                    <RowBetween style={{ marginTop: '4px', marginBottom: '4px' }} align="flex-end">
                      <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#fd3c99'}>
                        {volumeChangeUSD.toFixed(2)}%
                      </TYPE.main>
                    </RowBetween>
                  </AutoColumn>
                </Panel>
                <Panel style={{ padding: '18px 25px' }}>
                  <AutoColumn gap="4px">
                    <RowBetween>
                      <TYPE.heading>{topToken.name} Dominance</TYPE.heading>
                    </RowBetween>
                    <RowBetween style={{ marginTop: '4px', marginBottom: '4px' }} align="flex-end">
                      <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#46acb7'}>
                        {((topToken.tvl / totalVolumeUSD) * 100.0).toFixed(2)}%
                      </TYPE.main>
                    </RowBetween>
                  </AutoColumn>
                </Panel>
              </AutoColumn>
              <Panel style={{ height: '100%', minHeight: '300px' }}>{chart}</Panel>
            </AutoRow>
          )}
          {below800 && (
            <AutoColumn style={{ marginTop: '6px' }} gap="24px">
              <Panel style={{ height: '100%', minHeight: '300px' }}>{chart}</Panel>
            </AutoColumn>
          )}
          <ListOptions gap="10px" style={{ marginTop: '2rem', marginBottom: '.5rem' }}>
            <RowBetween>
              <TYPE.main fontSize={'1.125rem'}>TVL Rankings</TYPE.main>
              <RowFlat style={{ width: '100%' }}>
                <Filters filterOptions={chainOptions} setActive={setSelectedChain} activeLabel={selectedChain} />
              </RowFlat>
            </RowBetween>
          </ListOptions>
          <Panel style={{ marginTop: '6px', padding: '1.125rem 0 ' }}>
            <TokenList tokens={tokensList} />
          </Panel>
        </div>
      </ContentWrapper>
    </PageWrapper>
  )
}

export default GlobalPage
