import React, { useMemo } from 'react'
import styled from 'styled-components'
import Panel from '../Panel'
import { AutoColumn } from '../Column'
import { PageWrapper, FullWrapper } from 'components'
import { AutoRow, RowBetween, RowFlat } from 'components/Row'
import Search from 'components/Search'
import Filters from 'components/Filters'
import { NamePegged } from 'components/Table/index'
import PeggedChainsRow from 'components/PeggedChainsRow'
import {
  getRandomColor,
  capitalizeFirstLetter,
  formattedNum,
  formattedPegggedPrice,
  getPercentChange,
  getPrevCirculatingFromChart,
  getPeggedDominance,
} from 'utils'
import { useCalcCirculating, useCalcGroupExtraPeggedByDay } from 'hooks/data'
import { useLg } from 'hooks/useBreakpoints'
import { TYPE } from 'Theme'
import Table, { columnsToShow, isOfTypePeggedCategory } from 'components/Table'
import { PeggedChainPieChart, PeggedChainDominanceChart } from 'components/Charts'
import { categoryToPegType } from 'utils/dataApi'

const ListOptions = styled(AutoRow)`
  height: 40px;
  width: 100%;
  font-size: 1.25rem;
  font-weight: 600;

  @media screen and (max-width: 640px) {
    font-size: 1rem;
  }
`

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
      header: 'Total Circulating',
      accessor: 'circulating',
      Cell: ({ value }) => <>{value && formattedNum(value)}</>,
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
    const data = peggedTotals.map((chain) => ({ name: chain.name, value: chain.circulating }))

    const otherCirculating = data.slice(10).reduce((total, entry) => {
      return (total += entry.value)
    }, 0)

    return data
      .slice(0, 10)
      .sort((a, b) => b.value - a.value)
      .concat({ name: 'Others', value: otherCirculating })
  }, [peggedTotals])

  const chainColor = useMemo(
    () => Object.fromEntries([...peggedTotals, 'Others'].map((peggedAsset) => [peggedAsset.name, getRandomColor()])),
    [peggedTotals]
  )

  const peggedAssetNames = useMemo(() => peggedTotals.map((peggedAsset) => peggedAsset.name), [peggedTotals])

  const { data: stackedData, daySum } = useCalcGroupExtraPeggedByDay(stackedDataset)

  if (!title) {
    title = `Circulating`
    if (category) {
      title = `${capitalizeFirstLetter(category)} Circulating`
    }
    if (selectedChain !== 'All') {
      title = `${capitalizeFirstLetter(selectedChain)} ${capitalizeFirstLetter(category)} Circulating`
    }
  }

  const { circulating, percentChange } = useMemo(() => {
    const circulating = getPrevCirculatingFromChart(chartData, 0, 'totalCirculating', categoryToPegType[category])
    const circulatingPrevDay = getPrevCirculatingFromChart(
      chartData,
      1,
      'totalCirculating',
      categoryToPegType[category]
    )
    const percentChange = getPercentChange(circulating, circulatingPrevDay)?.toFixed(2)
    return { circulating, percentChange }
  }, [chartData, category])

  const circulatingToDisplay = formattedNum(circulating, true)

  const topToken = { name: 'Tether', circulating: 0 }
  if (peggedTotals.length > 0) {
    topToken.name = peggedTotals[0]?.name
    topToken.circulating = peggedTotals[0]?.circulating
  }

  const dominance = getPeggedDominance(topToken, circulating)

  const panels = (
    <>
      <Panel style={{ padding: '18px 25px', justifyContent: 'center' }}>
        <AutoColumn gap="4px">
          <RowBetween>
            <TYPE.heading>Total {title}</TYPE.heading>
          </RowBetween>
          <RowBetween style={{ marginTop: '4px', marginBottom: '-6px' }} align="flex-end">
            <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#4f8fea'}>
              {circulatingToDisplay}
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
            <TYPE.heading>{topToken.name} Dominance</TYPE.heading>
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
            {stackedDataset.length === 0 ? (
              <PeggedChainPieChart data={chainsCirculatingValues} chainColor={chainColor} />
            ) : (
              <PeggedChainDominanceChart
                stackOffset="expand"
                formatPercent={true}
                stackedDataset={stackedData}
                asset={title}
                chainsUnique={peggedAssetNames}
                chainColor={chainColor}
                daySum={daySum}
              />
            )}
          </BreakpointPanels>
        </div>
        {showChainList && (
          <ListOptions gap="10px" style={{ marginTop: '2rem', marginBottom: '.5rem' }}>
            <RowBetween>
              <RowFlat style={{ width: '100%' }}>
                <Filters filterOptions={chainOptions} setActive={handleRouting} activeLabel={selectedChain} />
              </RowFlat>
            </RowBetween>
          </ListOptions>
        )}
        <Table data={peggedTotals} columns={columns} />
      </FullWrapper>
    </PageWrapper>
  )
}

export default AllPeggedsPage
