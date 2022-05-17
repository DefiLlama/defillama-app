import React, { useMemo } from 'react'
import styled from 'styled-components'
import Panel from '../Panel'
import { AutoColumn } from '../Column'
import { PageWrapper, FullWrapper } from 'components'
import { RowBetween } from 'components/Row'
import Search from 'components/Search'
import { NamePegged } from 'components/Table/index'
import PeggedChainsRow from 'components/PeggedChainsRow'
import {
  getRandomColor,
  capitalizeFirstLetter,
  formattedNum,
  formattedPegggedPrice,
  getPercentChange,
  getPeggedDominance,
} from 'utils'
import { useCalcCirculating, useCalcGroupExtraPeggedByDay } from 'hooks/data'
import { useLg } from 'hooks/useBreakpoints'
import { TYPE } from 'Theme'
import Table, { columnsToShow, isOfTypePeggedCategory } from 'components/Table'
import { PeggedChainPieChart, PeggedChainDominanceChart } from 'components/Charts'
import Filters, { FiltersWrapper } from 'components/Filters'

export const BreakpointPanels = styled.div`
  @media screen and (min-width: 800px) {
    width: 100%;
    display: flex;
    padding: 0;
    align-items: stretch;
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

function AllPeggedsPage({
  title,
  category,
  selectedChain = 'All',
  chains = [],
  filteredPeggedAssets,
  chartData,
  stackedDataset,
  showChainList = true,
  defaultSortingColumn,
}) {
  let firstColumn = columnsToShow('protocolName')[0]

  const peggedColumn = `${category}`
  if (isOfTypePeggedCategory(peggedColumn)) {
    firstColumn = {
      header: 'Name',
      accessor: 'name',
      disableSortBy: true,
      Cell: ({ value, rowValues, rowIndex = null, rowType }) => (
        <NamePegged
          type="stablecoins"
          value={value}
          symbol={rowValues.symbol}
          index={rowIndex !== null && rowIndex + 1}
          bookmark
          rowType={rowType}
        />
      ),
    }
  }

  const columns = [
    firstColumn,
    {
      header: 'Chains',
      accessor: 'chains', // should change this
      disableSortBy: true,
      helperText: "Chains are ordered by pegged asset's highest issuance on each chain",
      Cell: ({ value }) => <PeggedChainsRow chains={value} />,
    },
    {
      header: 'Price',
      accessor: 'price',
      Cell: ({ value }) => <>{formattedPegggedPrice(value, true)}</>,
    },
    ...columnsToShow('1dChange', '7dChange', '1mChange'),
    {
      header: 'Market Cap',
      accessor: 'mcap',
      Cell: ({ value }) => <>{value && formattedNum(value, true)}</>,
    },
  ]

  const isLg = useLg()

  const handleRouting = (chain) => {
    if (chain === 'All') return `/peggedassets/${category}`
    return `/peggedassets/${category}/${chain}`
  }
  const chainOptions = ['All', ...chains].map((label) => ({ label, to: handleRouting(label) }))

  const peggedTotals = useCalcCirculating(filteredPeggedAssets, defaultSortingColumn)

  const chainsCirculatingValues = useMemo(() => {
    const data = peggedTotals.map((chain) => ({ name: chain.symbol, value: chain.mcap }))

    const otherCirculating = data.slice(10).reduce((total, entry) => {
      return (total += entry.value)
    }, 0)

    return data
      .slice(0, 10)
      .sort((a, b) => b.value - a.value)
      .concat({ name: 'Others', value: otherCirculating })
  }, [peggedTotals])

  const chainColor = useMemo(
    () => Object.fromEntries([...peggedTotals, 'Others'].map((peggedAsset) => [peggedAsset.symbol, getRandomColor()])),
    [peggedTotals]
  )

  const peggedAssetNames = useMemo(() => peggedTotals.map((peggedAsset) => peggedAsset.symbol), [peggedTotals])

  const { data: stackedData, daySum } = useCalcGroupExtraPeggedByDay(stackedDataset)

  if (!title) {
    title = `Market Cap`
    if (category) {
      title = `${capitalizeFirstLetter(category)} Market Cap`
    }
    if (selectedChain !== 'All') {
      title = `${capitalizeFirstLetter(selectedChain)} ${capitalizeFirstLetter(category)} Market Cap`
    }
  }

  const { percentChange, totalMcapCurrent } = useMemo(() => {
    const chartCurrent = chartData[chartData.length - 1] ?? null
    const chartPrevDay = chartData[chartData.length - 2] ?? null
    const totalMcapCurrent = chartCurrent?.mcap
    const totalMcapPrevDay = chartPrevDay?.mcap
    const percentChange = getPercentChange(totalMcapCurrent, totalMcapPrevDay)?.toFixed(2)
    return { percentChange, totalMcapCurrent }
  }, [chartData])

  const mcapToDisplay = formattedNum(totalMcapCurrent, true)

  let topToken = { symbol: 'USDT', mcap: 0 }
  if (peggedTotals.length > 0) {
    const topTokenData = peggedTotals[0]
    topToken.symbol = topTokenData.symbol
    topToken.mcap = topTokenData.mcap
  }

  const dominance = getPeggedDominance(topToken, totalMcapCurrent)

  const panels = (
    <>
      <Panel style={{ padding: '18px 25px', justifyContent: 'center' }}>
        <AutoColumn gap="4px">
          <RowBetween>
            <TYPE.heading>Total {title}</TYPE.heading>
          </RowBetween>
          <RowBetween style={{ marginTop: '4px', marginBottom: '-6px' }} align="flex-end">
            <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#4f8fea'}>
              {mcapToDisplay}
            </TYPE.main>
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
            <TYPE.heading>{topToken.symbol} Dominance</TYPE.heading>
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
      <FullWrapper>
        <RowBetween>
          <TYPE.largeHeader>{title}</TYPE.largeHeader>
          <Search small={!isLg} />
        </RowBetween>
        <div>
          <BreakpointPanels>
            <BreakpointPanelsColumn gap="10px">{panels}</BreakpointPanelsColumn>
            {stackedDataset.length < 30 ? (
              <PeggedChainPieChart data={chainsCirculatingValues} chainColor={chainColor} />
            ) : (
              <PeggedChainDominanceChart
                stackOffset="expand"
                formatPercent={true}
                stackedDataset={stackedData}
                chainsUnique={peggedAssetNames}
                chainColor={chainColor}
                daySum={daySum}
              />
            )}
          </BreakpointPanels>
        </div>

        {showChainList && (
          <FiltersWrapper>
            <Filters filterOptions={chainOptions} activeLabel={selectedChain} />
          </FiltersWrapper>
        )}

        <Table data={peggedTotals} columns={columns} />
      </FullWrapper>
    </PageWrapper>
  )
}

export default AllPeggedsPage
