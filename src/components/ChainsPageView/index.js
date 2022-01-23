import React, { useMemo } from 'react'
import { Box } from 'rebass/styled-components'
import styled from 'styled-components'

import { PageWrapper, FullWrapper } from 'components'
import { ButtonDark } from '../ButtonStyled'
import { RowBetween } from '../Row'
import Search from '../Search'
import TokenList from '../TokenList'
import { ChainPieChart, ChainDominanceChart } from '../Charts'
import { Header } from 'Theme'

import { useCalcChainsTvlsByDay, useCalcStakePool2Tvl } from 'hooks/data'
import { toNiceCsvDate, chainIconUrl, getRandomColor } from 'utils'
import { AllTvlOptions } from '../SettingsModal'
import Filters from '../Filters'

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

const ChainsView = ({ chainsUnique, chainTvls, stackedDataset, category, categories }) => {
  const chainColor = useMemo(
    () => Object.fromEntries([...chainsUnique, 'Others'].map((chain) => [chain, getRandomColor()])),
    [chainsUnique]
  )

  const chainTotals = useCalcStakePool2Tvl(chainTvls)

  const chainsTvlValues = useMemo(() => {
    const data = chainTotals.map((chain) => ({ name: chain.name, value: chain.tvl }))

    const otherTvl = data.slice(10).reduce((total, entry) => {
      return (total += entry.value)
    }, 0)

    return data
      .slice(0, 10)
      .sort((a, b) => b.value - a.value)
      .concat({ name: 'Others', value: otherTvl })
  }, [chainTotals])

  const { data: stackedData, daySum } = useCalcChainsTvlsByDay(stackedDataset)

  const downloadCsv = () => {
    const rows = [['Timestamp', 'Date', ...chainsUnique]]
    stackedData
      .sort((a, b) => a.date - b.date)
      .forEach((day) => {
        rows.push([day.date, toNiceCsvDate(day.date), ...chainsUnique.map((chain) => day[chain] ?? '')])
      })
    download('chains.csv', rows.map((r) => r.join(',')).join('\n'))
  }

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
          tokens={chainTotals}
          iconUrl={chainIconUrl}
          generateLink={(name) => `/chain/${name}`}
          columns={[undefined, 'protocols', 'change_1d', 'change_7d', 'change_1m']}
        />
      </FullWrapper>
    </PageWrapper>
  )
}

export default ChainsView
