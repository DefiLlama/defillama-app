import React, { useMemo } from 'react'
import { Box } from 'rebass/styled-components'
import styled from 'styled-components'

import { PageWrapper, FullWrapper } from 'components'
import { ButtonDark } from 'components/ButtonStyled'
import { RowBetween } from 'components/Row'
import Search from 'components/Search'
import TokenList from 'components/TokenList'
import { ChainPieChart, ChainDominanceChart } from 'components/Charts'
import { GeneralLayout } from 'layout'
import { Header } from 'Theme'

import { PROTOCOLS_API, CHART_API, CONFIG_API } from 'constants/index'
import { useCalcStakePool2Tvl } from 'hooks/data'
import { useLg } from 'hooks/useBreakpoints'
import { toNiceCsvDate, chainIconUrl, getRandomColor } from 'utils'
import { revalidate } from 'utils/dataApi'
import { useGetExtraTvlEnabled } from 'contexts/LocalStorage'

function getPercentChange(previous, current) {
  return (current / previous) * 100 - 100
}

function download(filename, text) {
  var element = document.createElement('a')
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text))
  element.setAttribute('download', filename)

  element.style.display = 'none'
  document.body.appendChild(element)

  element.click()

  document.body.removeChild(element)
}

const ChartsWrapper = styled(Box)`
  display: flex;
  flex-wrap: nowrap;
  width: 100%;
  padding: 0;
  align-items: center;
  @media (max-width: 800px) {
    display: grid;
    grid-auto-rows: auto;
  }
`

const ChainsView = ({ chainsUnique, chainTvls, stackedDataset, daySum }) => {
  const isLg = useLg()

  const chainColor = useMemo(
    () => Object.fromEntries([...chainsUnique, 'Others'].map(chain => [chain, getRandomColor()])),
    [chainsUnique]
  )

  function downloadCsv() {
    const rows = [['Timestamp', 'Date', ...chainsUnique]]
    stackedDataset
      .sort((a, b) => a.date - b.date)
      .forEach(day => {
        rows.push([day.date, toNiceCsvDate(day.date), ...chainsUnique.map(chain => day[chain] ?? '')])
      })
    download('chains.csv', rows.map(r => r.join(',')).join('\n'))
  }

  const protocolTotals = useCalcStakePool2Tvl(chainTvls)

  const extraTvlsEnabled = useGetExtraTvlEnabled()

  const chainsTvlValues = useMemo(() => {
    const data = chainTvls.reduce((acc, curr) => {
      let tvl = curr.tvl || 0
      Object.entries(curr.extraTvl || {}).forEach(([section, sectionTvl]) => {
        if (extraTvlsEnabled[section.toLowerCase()]) tvl += sectionTvl
      })
      const data = { name: curr.name, value: tvl }
      return (acc = [...acc, data])
    }, [])

    const otherTvl = data.slice(10).reduce((total, entry) => {
      return (total += entry.value)
    }, 0)
    return data
      .slice(0, 10)
      .sort((a, b) => b.value - a.value)
      .concat({ name: 'Others', value: otherTvl })
  }, [chainTvls, extraTvlsEnabled])

  return (
    <PageWrapper>
      <FullWrapper>
        <RowBetween>
          <Header>Total Value Locked All Chains</Header>
          <Search small={!isLg} />
        </RowBetween>

        <ChartsWrapper>
          <ChainPieChart data={chainsTvlValues} chainColor={chainColor} />
          <ChainDominanceChart
            stackOffset="expand"
            formatPercent={true}
            stackedDataset={stackedDataset}
            chainsUnique={chainsUnique}
            chainColor={chainColor}
            daySum={daySum}
          />
        </ChartsWrapper>
        <div style={{ margin: 'auto' }}>
          <ButtonDark onClick={downloadCsv}>Download all data in .csv</ButtonDark>
        </div>
        <TokenList
          canBookmark={false}
          tokens={protocolTotals}
          iconUrl={chainIconUrl}
          generateLink={name => `/chain/${name}`}
          columns={[undefined, 'protocols', 'change_1d', 'change_7d']}
        />
      </FullWrapper>
    </PageWrapper>
  )
}

export async function getStaticProps() {
  const [res, { chainCoingeckoIds }] = await Promise.all(
    [PROTOCOLS_API, CONFIG_API].map(apiEndpoint => fetch(apiEndpoint).then(r => r.json()))
  )
  const chainsUnique = res.chains.filter(t => t !== "Syscoin")

  const chainCalls = Promise.all(chainsUnique.map(elem => fetch(`${CHART_API}/${elem}`).then(resp => resp.json())))

  const chainMcapsPromise = fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${Object.values(chainCoingeckoIds)
      .map(v => v.geckoId)
      .join(',')}&vs_currencies=usd&include_market_cap=true`
  ).then(res => res.json())
  const numProtocolsPerChain = {}
  const extraPropPerChain = {}

  res.protocols.forEach(protocol => {
    protocol.chains.forEach(chain => {
      numProtocolsPerChain[chain] = (numProtocolsPerChain[chain] || 0) + 1
    })
    Object.entries(protocol.chainTvls).forEach(([tvlKey, tvlValue]) => {
      if (tvlKey.includes('-')) {
        const prop = tvlKey.split('-')[1].toLowerCase()
        const chain = tvlKey.split('-')[0]
        if (extraPropPerChain[chain] === undefined) {
          extraPropPerChain[chain] = {}
        }
        extraPropPerChain[chain][prop] = (extraPropPerChain[chain][prop] || 0) + tvlValue
      }
    })
  })

  const data = (await chainCalls).map(c => c.tvl)
  const chainMcaps = await chainMcapsPromise

  const chainTvls = chainsUnique
    .map((chainName, i) => {
      const prevTvl = daysBefore => data[i][data[i].length - 1 - daysBefore]?.[1]
      const current = prevTvl(0)
      const mcap = chainMcaps[chainCoingeckoIds[chainName]?.geckoId]?.usd_market_cap
      return {
        tvl: current,
        mcap: mcap || null,
        name: chainName,
        symbol: chainCoingeckoIds[chainName]?.symbol ?? '-',
        protocols: numProtocolsPerChain[chainName],
        extraTvl: extraPropPerChain[chainName] || {},
        change_1d: prevTvl(1) ? getPercentChange(prevTvl(1), current) : null,
        change_7d: prevTvl(7) ? getPercentChange(prevTvl(7), current) : null
      }
    })
    .sort((a, b) => b.tvl - a.tvl)

  const daySum = {}
  const stackedDataset = Object.values(
    data.reduce((total, chain, i) => {
      const chainName = chainsUnique[i]
      chain.forEach(dayTvl => {
        if (dayTvl[0] < 1596248105) return
        if (total[dayTvl[0]] === undefined) {
          total[dayTvl[0]] = { date: dayTvl[0] }
        }
        total[dayTvl[0]][chainName] = dayTvl[1]
        daySum[dayTvl[0]] = (daySum[dayTvl[0]] || 0) + dayTvl[1]
      })
      return total
    }, {})
  )

  return {
    props: {
      chainsUnique,
      chainTvls,
      stackedDataset,
      daySum
    },
    revalidate: revalidate()
  }
}

export default function Chains(props) {
  return (
    <GeneralLayout title={`Chain TVL - DefiLlama`} defaultSEO>
      <ChainsView {...props} />
    </GeneralLayout>
  )
}
