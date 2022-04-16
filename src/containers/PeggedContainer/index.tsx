import React, { useMemo, useState } from 'react'
import { Box } from 'rebass/styled-components'
import styled from 'styled-components'
import { Header } from 'Theme'
import { PageWrapper, FullWrapper } from 'components'
import { ButtonDark } from 'components/ButtonStyled'
import { RowBetween } from 'components/Row'
import Search from 'components/Search'
import { PeggedChainPieChart, PeggedChainDominanceChart } from 'components/Charts'
import { AllTvlOptions } from 'components/SettingsModal'
import Filters from 'components/Filters'
import { columnsToShow, FullTable } from 'components/Table'
import { toNiceCsvDate, getRandomColor, download } from 'utils'
import { getPeggedChainsPageData, revalidate } from 'utils/peggedDataApi'
import { useCalcGroupExtraTvlsByDay, useCalcCirculating } from 'hooks/peggedData'

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

const Capitalize = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const columns = columnsToShow('chainName', 'issuance')

export default function PeggedContainer({
  chainsUnique,
  chainTvls,
  category,
  categories,
  stackedDataset,
  peggedasset,
}) {
  const chainColor = useMemo(
    () => Object.fromEntries([...chainsUnique, 'Others'].map((chain) => [chain, getRandomColor()])),
    [chainsUnique]
  )

  const chainTotals = useCalcCirculating(chainTvls, peggedasset)

  const chainsTvlValues = useMemo(() => {
    const data = chainTotals.map((chain) => ({ name: chain.name, value: chain.circulating }))

    const otherTvl = data.slice(10).reduce((total, entry) => {
      return (total += entry.value)
    }, 0)

    return data
      .slice(0, 10)
      .sort((a, b) => b.value - a.value)
      .concat({ name: 'Others', value: otherTvl })
  }, [chainTotals])

  const { data: stackedData, daySum } = useCalcGroupExtraTvlsByDay(stackedDataset)

  const showByGroup = ['All', 'Non-EVM'].includes(category) ? true : false

  return (
    <PageWrapper>
      <FullWrapper>
        <Search />
        <RowWrapper>
          <Header>{Capitalize(peggedasset)} Total Issuance All Chains</Header>
        </RowWrapper>
        <ChartsWrapper>
          <PeggedChainPieChart data={chainsTvlValues} chainColor={chainColor} />
          <PeggedChainDominanceChart
            stackOffset="expand"
            formatPercent={true}
            stackedDataset={stackedData}
            asset={peggedasset}
            chainsUnique={chainsUnique}
            chainColor={chainColor}
            daySum={daySum}
          />
        </ChartsWrapper>
        <Filters filterOptions={categories} activeLabel={category} />
        <StyledTable data={chainTotals} columns={columns} showByGroup={showByGroup} />
      </FullWrapper>
    </PageWrapper>
  )
}
