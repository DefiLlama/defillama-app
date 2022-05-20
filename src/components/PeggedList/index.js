import React, { useMemo, useState } from 'react'
import { OptionButton } from 'components/ButtonStyled'
import { AutoColumn } from '../Column'
import { RowBetween, AutoRow } from 'components/Row'
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
  toNiceMonthlyDate,
} from 'utils'
import { useCalcCirculating, useCalcGroupExtraPeggedByDay } from 'hooks/data'
import { useLg, useXl, useMed } from 'hooks/useBreakpoints'
import { TYPE } from 'Theme'
import Table, { columnsToShow, isOfTypePeggedCategory } from 'components/Table'
import { PeggedChainResponsivePie, PeggedChainResponsiveDominance } from 'components/Charts'
import Filters, { FiltersWrapper } from 'components/Filters'
import { useDarkModeManager } from 'contexts/LocalStorage'
import { GeneralAreaChart } from 'components/TokenChart'
import { BreakpointPanels, BreakpointPanelsColumn, Panel } from 'components'

function Chart({ formattedPeggedAreaChart, peggedAssetNames, aspect }) {
  const [darkMode] = useDarkModeManager()
  const textColor = darkMode ? 'white' : 'black'
  return (
    <GeneralAreaChart
      aspect={aspect}
      finalChartData={formattedPeggedAreaChart}
      tokensUnique={peggedAssetNames}
      textColor={textColor}
      color={'blue'}
      moneySymbol="$"
      formatDate={toNiceMonthlyDate}
      hallmarks={[]}
    />
  )
}

function AllPeggedsPage({
  title,
  category,
  selectedChain = 'All',
  chains = [],
  filteredPeggedAssets,
  chartData,
  formattedPeggedAreaChart,
  stackedDataset,
  peggedChartType,
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

  const [chartType, setChartType] = useState(peggedChartType)

  const belowMed = useMed()
  const belowLg = useLg()
  const belowXl = useXl()
  const aspect = belowXl ? (belowMed ? 1 : 60 / 42) : 60 / 22

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
    <>
      <RowBetween>
        <TYPE.largeHeader>{title}</TYPE.largeHeader>
        <Search small={!belowLg} />
      </RowBetween>
      <div>
        <BreakpointPanels>
          <BreakpointPanelsColumn gap="10px">{panels}</BreakpointPanelsColumn>
          <Panel style={{ height: '100%', minHeight: '347px', flex: 1, maxWidth: '100%' }}>
            <RowBetween
              mb={useMed ? 40 : 0}
              align="flex-start"
            >
              <AutoRow style={{ width: 'fit-content' }} justify="flex-end" gap="6px" align="flex-start">
                <OptionButton active={chartType === 'Area'} onClick={() => setChartType('Area')}>
                  Area
                </OptionButton>
                <OptionButton active={chartType === 'Dominance'} onClick={() => setChartType('Dominance')}>
                  Dominance
                </OptionButton>
                <OptionButton active={chartType === 'Pie'} onClick={() => setChartType('Pie')}>
                  Pie
                </OptionButton>
              </AutoRow>
            </RowBetween>
            {chartType === 'Area' && <Chart {...{ formattedPeggedAreaChart, peggedAssetNames, aspect }} />}
            {chartType === 'Dominance' && (
              <PeggedChainResponsiveDominance
                stackOffset="expand"
                formatPercent={true}
                stackedDataset={stackedData}
                chainsUnique={peggedAssetNames}
                chainColor={chainColor}
                daySum={daySum}
                aspect={aspect}
              />
            )}
            {chartType === 'Pie' && <PeggedChainResponsivePie data={chainsCirculatingValues} chainColor={chainColor} aspect={aspect} />}
          </Panel>
        </BreakpointPanels>
      </div>

      {showChainList && (
        <FiltersWrapper>
          <Filters filterOptions={chainOptions} activeLabel={selectedChain} />
        </FiltersWrapper>
      )}

      <Table data={peggedTotals} columns={columns} />
    </>
  )
}

export default AllPeggedsPage
