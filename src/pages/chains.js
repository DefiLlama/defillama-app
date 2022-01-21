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

import { useCalcStakePool2Tvl } from 'hooks/data'
import { toNiceCsvDate, chainIconUrl, getRandomColor } from 'utils'
import { getChainsPageData, revalidate } from 'utils/dataApi'
import { useGetExtraTvlEnabled } from 'contexts/LocalStorage'
import { AllTvlOptions } from 'components/SettingsModal'
import Filters from 'components/Filters'

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

const RowWrapper = styled(RowBetween)`
  flex-wrap: wrap;
  @media (max-width: 600px) {
    gap: 16px;
  }
`

export const ChainsView = ({ chainsUnique, chainTvls, stackedDataset, category, categories }) => {
  const chainColor = useMemo(
    () => Object.fromEntries([...chainsUnique, 'Others'].map((chain) => [chain, getRandomColor()])),
    [chainsUnique]
  )

  const extraTvlsEnabled = useGetExtraTvlEnabled()

  const protocolTotals = useCalcStakePool2Tvl(chainTvls)

  const [stackedData, daySum] = useMemo(() => {
    const daySum = {}
    const stackedData = stackedDataset.map(([date, value]) => {
      let totalDaySum = 0
      const tvls = {}
      Object.entries(value).forEach(([name, chainTvls]) => {
        let sum = chainTvls.tvl
        totalDaySum += chainTvls.tvl || 0
        for (const c in chainTvls) {
          if (extraTvlsEnabled[c.toLowerCase()]) {
            sum += chainTvls[c]
            totalDaySum += chainTvls[c]
          }
        }
        tvls[name] = sum
      })
      daySum[date] = totalDaySum
      return { date, ...tvls }
    })
    return [stackedData, daySum]
  }, [stackedDataset, extraTvlsEnabled])

  const downloadCsv = () => {
    const rows = [['Timestamp', 'Date', ...chainsUnique]]
    stackedData
      .sort((a, b) => a.date - b.date)
      .forEach((day) => {
        rows.push([day.date, toNiceCsvDate(day.date), ...chainsUnique.map((chain) => day[chain] ?? '')])
      })
    download('chains.csv', rows.map((r) => r.join(',')).join('\n'))
  }

  const chainsTvlValues = useMemo(() => {
    const data = chainTvls.reduce((acc, curr) => {
      let tvl = curr.tvl || 0
      Object.entries(curr.extraTvl || {}).forEach(([section, sectionTvl]) => {
        if (extraTvlsEnabled[section.toLowerCase()]) tvl = tvl + (sectionTvl.tvl || 0)
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
        <Search />
        <AllTvlOptions style={{ display: 'flex', justifyContent: 'center' }} />
        <RowWrapper>
          <Header>Total Value Locked All Chains</Header>
          <ButtonDark onClick={downloadCsv}>Download all data in .csv</ButtonDark>
        </RowWrapper>
        <ChartsWrapper>
          <ChainPieChart data={chainsTvlValues} chainColor={chainColor} />
          <ChainDominanceChart
            stackOffset="expand"
            formatPercent={true}
            stackedDataset={stackedData}
            chainsUnique={chainsUnique}
            chainColor={chainColor}
            daySum={daySum}
          />
        </ChartsWrapper>
        <Filters filterOptions={categories} activeLabel={category} />
        <TokenList
          canBookmark={false}
          tokens={protocolTotals}
          iconUrl={chainIconUrl}
          generateLink={(name) => `/chain/${name}`}
          columns={[undefined, 'protocols', 'change_1d', 'change_7d', 'change_1m']}
        />
      </FullWrapper>
    </PageWrapper>
  )
}

export async function getStaticProps() {
  const data = await getChainsPageData('All')
  return {
    ...data,
    revalidate: revalidate(),
  }
}

export default function Chains(props) {
  return (
    <GeneralLayout title={`Chain TVL - DefiLlama`} defaultSEO>
      <ChainsView {...props} />
    </GeneralLayout>
  )
}
