import React, { useMemo } from 'react'
import { Box } from 'rebass/styled-components'
import styled from 'styled-components'
import { Header } from 'Theme'
import { PageWrapper, FullWrapper } from 'components'
import { ButtonDark } from 'components/ButtonStyled'
import { RowBetween } from 'components/Row'
import Search from 'components/Search'
import { ChainPieChart, ChainDominanceChart } from 'components/Charts'
import { AllTvlOptions } from 'components/SettingsModal'
import Filters from 'components/Filters'
import { columnsToShow, FullTable } from 'components/Table'
import { toNiceCsvDate, getRandomColor, download } from 'utils'
import { getChainsPageData, revalidate } from 'utils/dataApi'
import { useCalcGroupExtraTvlsByDay, useCalcStakePool2Tvl, useGroupChainsByParent } from 'hooks/data'

export async function getStaticProps() {
  const data = await getChainsPageData('All')
  return {
    ...data,
    revalidate: revalidate(),
  }
}

const ChartsWrapper = styled(Box)`
  display: flex;
  flex-wrap: nowrap;
  width: 100%;
  padding: 0;
  align-items: center;
  z-index: 1;
  @media (max-width: 800px) {
    display: grid;
    grid-auto-rows: auto;
  }
`

const RowWrapper = styled(RowBetween)`
  flex-wrap: wrap;
  @media (max-width: 680px) {
    gap: 16px;
  }
`

interface ITable {
  showByGroup?: boolean
}

const StyledTable = styled(FullTable)<ITable>`
  tr > :first-child {
    padding-left: ${({ showByGroup }) => (showByGroup ? '40px' : '20px')};
  }
`

const columns = columnsToShow('chainName', 'protocols', '1dChange', '7dChange', '1mChange', 'tvl', 'mcaptvl')

export default function ChainsContainer({
  chainsUnique,
  chainTvls,
  stackedDataset,
  category,
  categories,
  chainsGroupbyParent,
}) {
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

  const { data: stackedData, daySum } = useCalcGroupExtraTvlsByDay(stackedDataset)

  const downloadCsv = () => {
    const rows = [['Timestamp', 'Date', ...chainsUnique]]
    stackedData
      .sort((a, b) => a.date - b.date)
      .forEach((day) => {
        rows.push([day.date, toNiceCsvDate(day.date), ...chainsUnique.map((chain) => day[chain] ?? '')])
      })
    download('chains.csv', rows.map((r) => r.join(',')).join('\n'))
  }

  const showByGroup = ['All', 'Non-EVM'].includes(category) ? true : false

  const groupedChains = useGroupChainsByParent(chainTotals, showByGroup ? chainsGroupbyParent : {})

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
        <StyledTable data={groupedChains} columns={columns} showByGroup={showByGroup} />
      </FullWrapper>
    </PageWrapper>
  )
}
