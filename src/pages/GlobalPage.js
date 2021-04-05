import React, { useEffect, useState } from 'react'
import { withRouter } from 'react-router-dom'
import styled from 'styled-components'

import { AutoRow, RowBetween, RowFlat } from '../components/Row'
import Loader from '../components/LocalLoader'
import ProtocolChart from '../components/ProtocolChart'
import { AutoColumn } from '../components/Column'
import TopTokenList from '../components/TokenList'
import GlobalChart from '../components/GlobalChart'
import Search from '../components/Search'
import { ButtonLight, ButtonDark } from '../components/ButtonStyled'

import { useGlobalData } from '../contexts/GlobalData'
import { useMedia } from 'react-use'
import Panel from '../components/Panel'
import { useAllTokenData } from '../contexts/TokenData'
import { formattedNum } from '../utils'
import { TYPE, ThemedBackground } from '../Theme'
import { transparentize } from 'polished'
import { CustomLink } from '../components/Link'

import { PageWrapper, ContentWrapper } from '../components'
import { fetchAPI } from '../contexts/API'

const ListOptions = styled(AutoRow)`
  height: 40px;
  width: 100%;
  font-size: 1.25rem;
  font-weight: 600;

  @media screen and (max-width: 640px) {
    font-size: 1rem;
  }
`

function GlobalPage({ chain }) {
  // get data for lists and totals
  let allTokens = useAllTokenData()
  //const transactions = useGlobalTransactions()
  const globalData = useGlobalData()
  const [chainChartData, setChainChartData] = useState({});
  const [oldChain, setOldChain] = useState(undefined);
  const [selectedChain, setSelectedChain] = useState(chain);

  let { totalVolumeUSD, volumeChangeUSD } = globalData

  if (selectedChain !== undefined) {
    if (oldChain !== selectedChain && chainChartData[selectedChain] === undefined) {
      setOldChain(selectedChain);
      const chartName = selectedChain === 'Others' ? 'Multi-chain' : selectedChain
      fetchAPI(`https://api.defillama.com/charts/${chartName}`).then(chart => setChainChartData({
        [selectedChain]: chart
      }))
    }
    const chartData = chainChartData[selectedChain];
    if (chartData === undefined) {
      totalVolumeUSD = 0;
      volumeChangeUSD = 0;
    } else {
      totalVolumeUSD = chartData[chartData.length - 1].totalLiquidityUSD
      volumeChangeUSD = ((chartData[chartData.length - 1].totalLiquidityUSD - chartData[chartData.length - 2].totalLiquidityUSD) /
        chartData[chartData.length - 2].totalLiquidityUSD) *
        100
    }
    allTokens = Object.fromEntries(Object.entries(allTokens).filter(token => {
      try {
        const chains = JSON.parse(token[1].chains)
        if (selectedChain === 'Others') {
          return chains.some(chain => chain !== 'Ethereum' && chain !== 'Binance')
        }
        return chains.includes(selectedChain);
      } catch (e) {
        return false
      }
    }));
  }
  const tokensList = Object.values(allTokens)
    .sort((token1, token2) => Number(token2.tvl) - Number(token1.tvl))

  const topToken = { name: 'Uniswap', tvl: '0' }
  if (tokensList.length > 0) {
    topToken.name = tokensList[0]?.name
    topToken.tvl = tokensList[0]?.tvl
  }

  // breakpoints
  const below800 = useMedia('(max-width: 800px)')

  // scrolling refs
  useEffect(() => {
    document.querySelector('body').scrollTo({
      behavior: 'smooth',
      top: 0
    })
  }, [])

  document.title = `DefiLlama - DeFi Dashboard`;

  const chart = selectedChain === undefined ? <GlobalChart display="liquidity" /> :
    chainChartData[selectedChain] !== undefined ? <ProtocolChart
      chartData={chainChartData[selectedChain]}
      protocol={selectedChain}
    /> : <Loader />;

  return (
    <PageWrapper>
      <ThemedBackground backgroundColor={transparentize(0.8, '#445ed0')} />
      <ContentWrapper>
        <div>
          <AutoColumn gap="24px" style={{ paddingBottom: below800 ? '0' : '24px' }}>
            <TYPE.largeHeader>Defi Dashboard</TYPE.largeHeader>
            <Search />
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
              <Panel style={{ height: '100%', minHeight: '300px' }}>
                {chart}
              </Panel>
            </AutoRow>
          )}
          {below800 && (
            <AutoColumn style={{ marginTop: '6px' }} gap="24px">
              <Panel style={{ height: '100%', minHeight: '300px' }}>
                {chart}
              </Panel>
            </AutoColumn>
          )}
          <ListOptions gap="10px" style={{ marginTop: '2rem', marginBottom: '.5rem' }}>
            <RowBetween>
              <TYPE.main fontSize={'1.125rem'}>TVL Rankings</TYPE.main>
              <RowFlat>
                {['All', 'Ethereum', 'Binance', 'Others'].map((name, i) => {
                  if (selectedChain === name || (name === 'All' && selectedChain === undefined)) {
                    return <ButtonDark style={{ margin: '0.2rem' }} key={name} >{name}</ButtonDark>
                  } else {
                    return <ButtonLight style={{ margin: '0.2rem' }} key={name} onClick={() => {
                      setSelectedChain(name === 'All' ? undefined : name)
                    }}>{name}</ButtonLight>
                  }
                })}
              </RowFlat>
              <CustomLink to={'/protocols'}>See All</CustomLink>
            </RowBetween>
          </ListOptions>
          <Panel style={{ marginTop: '6px', padding: '1.125rem 0 ' }}>
            <TopTokenList tokens={allTokens} />
          </Panel>
        </div>
      </ContentWrapper>
    </PageWrapper>
  )
}

export default withRouter(GlobalPage)
