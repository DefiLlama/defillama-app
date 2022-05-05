import React, { useMemo, useState } from 'react'
import { Box } from 'rebass/styled-components'
import styled from 'styled-components'
import { Header } from 'Theme'
import { PageWrapper, FullWrapper } from 'components'
import { ButtonDark } from 'components/ButtonStyled'
import { RowBetween } from 'components/Row'
import Search from 'components/Search'
import { PeggedChainPieChart, PeggedChainDominanceChart } from 'components/Charts'
import { AllPeggedOptions } from 'components/SettingsModal'
import Filters from 'components/Filters'
import { CustomLink } from 'components/Link'
import { columnsToShow, FullTable, NamePegged, isOfTypePeggedCategory } from 'components/Table'
import { toNiceCsvDate, getRandomColor, formattedNum, download } from 'utils'
import { useCalcGroupExtraPeggedByDay, useCalcCirculating } from 'hooks/data'

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

export default function PeggedContainer({
  chainsUnique,
  chainCirculatings,
  category,
  categories,
  stackedDataset,
  peggedasset,
  pegType,
}) {
  let firstColumn = columnsToShow('chainName')[0]

  const peggedColumn = `${pegType}`
  if (isOfTypePeggedCategory(peggedColumn)) {
    firstColumn = {
      header: 'Name',
      accessor: 'name',
      disableSortBy: true,
      Cell: ({ value, rowValues, rowIndex = null, rowType, showRows }) => (
        <NamePegged
          type="peggedUSD"
          value={value}
          symbol={rowValues.symbol}
          index={rowType === 'child' ? '-' : rowIndex !== null && rowIndex + 1}
          rowType={rowType}
          showRows={showRows}
        />
      ),
    }
  }

  const columns = [
    firstColumn,
    {
      header: 'Primary Bridge',
      accessor: 'bridgeInfo',
      disableSortBy: true,
      Cell: ({ value }) => {
        return value.link ? <CustomLink href={value.link}>{value.bridge}</CustomLink> : <span>{value.bridge}</span>
      },
    },
    {
      header: 'Bridged Amount',
      accessor: 'bridgedAmount',
      disableSortBy: true,
      Cell: ({ value }) => <>{typeof value === 'string' ? value : formattedNum(value)}</>,
    },
    ...columnsToShow('1dChange', '7dChange', '1mChange'),
    {
      header: 'Total Circulating',
      accessor: 'circulating',
      Cell: ({ value }) => <>{value && formattedNum(value)}</>,
    },
  ]

  const chainColor = useMemo(
    () => Object.fromEntries([...chainsUnique, 'Others'].map((chain) => [chain, getRandomColor()])),
    [chainsUnique]
  )

  const chainTotals = useCalcCirculating(chainCirculatings, peggedasset)

  const chainsCirculatingValues = useMemo(() => {
    const data = chainTotals.map((chain) => ({ name: chain.name, value: chain.circulating }))

    const otherCirculating = data.slice(10).reduce((total, entry) => {
      return (total += entry.value)
    }, 0)

    return data
      .slice(0, 10)
      .sort((a, b) => b.value - a.value)
      .concat({ name: 'Others', value: otherCirculating })
  }, [chainTotals])

  const { data: stackedData, daySum } = useCalcGroupExtraPeggedByDay(stackedDataset)

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

  //add usegroupedchainsbyparent?

  return (
    <PageWrapper>
      <FullWrapper>
        <Search />
        <AllPeggedOptions style={{ display: 'flex', justifyContent: 'center' }} />
        <RowWrapper>
          <Header>{Capitalize(peggedasset)} Total Circulating All Chains</Header>
          <ButtonDark onClick={downloadCsv}>Download all data in .csv</ButtonDark>
        </RowWrapper>
        <ChartsWrapper>
          <PeggedChainPieChart data={chainsCirculatingValues} chainColor={chainColor} />
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
