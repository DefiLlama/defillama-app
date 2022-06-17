import React, { useMemo } from 'react'
import styled from 'styled-components'
import { ButtonDark } from 'components/ButtonStyled'
import { PeggedChainPieChart, PeggedChainDominanceChart } from 'components/Charts'
import { CustomLink } from 'components/Link'
import { columnsToShow, FullTable } from 'components/Table'
import { toNiceCsvDate, getRandomColor, formattedNum, download } from 'utils'
import { useCalcGroupExtraPeggedByDay, useCalcCirculating, useGroupBridgeData } from 'hooks/data'
import Filters, { FiltersWrapper } from 'components/Filters'
import { PeggedAssetTvlOptions } from 'components/Select'
import { Header } from 'Theme'
import { PeggedSearch } from 'components/Search/OpenSearch'

const ChartsWrapper = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  padding: 0;
  align-items: center;
  z-index: 1;

  & > * {
    width: 100%;
    margin: 0 !important;
  }

  @media (min-width: 80rem) {
    flex-direction: row;
  }
`

interface ITable {
  showByGroup?: boolean
}

const HeaderWrapper = styled(Header)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  border: 1px solid transparent;
`

const AssetFilters = styled.div`
  margin: 12px 0 16px;

  & > h2 {
    margin: 0 2px 8px;
    font-weight: 600;
    font-size: 0.825rem;
    color: ${({ theme }) => theme.text1};
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

const columns = [
  ...columnsToShow('peggedAssetChain'),
  {
    header: 'Bridge',
    accessor: 'bridgeInfo',
    disableSortBy: true,
    Cell: ({ value }) => {
      return value.link ? <CustomLink href={value.link}>{value.name}</CustomLink> : <span>{value.name}</span>
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

export default function PeggedContainer({
  chainsUnique,
  chainCirculatings,
  category,
  categories,
  stackedDataset,
  peggedSymbol,
  bridgeInfo,
}) {
  const chainColor = useMemo(
    () => Object.fromEntries([...chainsUnique, 'Others'].map((chain) => [chain, getRandomColor()])),
    [chainsUnique]
  )

  const chainTotals = useCalcCirculating(chainCirculatings)

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
    download('peggedAssetChains.csv', rows.map((r) => r.join(',')).join('\n'))
  }

  const showByGroup = ['All', 'Non-EVM'].includes(category) ? true : false

  const groupedChains = useGroupBridgeData(chainTotals, bridgeInfo)

  return (
    <>
      <PeggedSearch
        step={{ category: 'Pegged Asset', name: Capitalize(peggedSymbol), route: 'peggedassets', hideOptions: true }}
      />

      <HeaderWrapper>
        <span>{Capitalize(peggedSymbol)} Total Circulating All Chains</span>
        <ButtonDark onClick={downloadCsv}>Download all data in .csv</ButtonDark>
      </HeaderWrapper>

      <ChartsWrapper>
        <PeggedChainPieChart data={chainsCirculatingValues} chainColor={chainColor} />
        <PeggedChainDominanceChart
          stackOffset="expand"
          formatPercent={true}
          stackedDataset={stackedData}
          asset={peggedSymbol}
          chainsUnique={chainsUnique}
          chainColor={chainColor}
          daySum={daySum}
        />
      </ChartsWrapper>

      <AssetFilters>
        <h2>Filters</h2>
        <PeggedAssetTvlOptions label="Filters" />
      </AssetFilters>

      <FiltersWrapper>
        <Filters filterOptions={categories} activeLabel={category} />
      </FiltersWrapper>

      <StyledTable data={groupedChains} columns={columns} showByGroup={showByGroup} />
    </>
  )
}
