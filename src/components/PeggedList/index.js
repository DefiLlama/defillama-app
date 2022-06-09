import React, { useMemo, useState } from 'react'
import styled from 'styled-components'
import { OptionButton } from 'components/ButtonStyled'
import { AutoColumn } from '../Column'
import { RowBetween, AutoRow } from 'components/Row'
import Search from 'components/Search'
import PeggedViewSwitch from 'components/PeggedViewSwitch'
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
import Table, { columnsToShow, isOfTypePeggedCategory, NamePegged } from 'components/Table'
import { PeggedChainResponsivePie, PeggedChainResponsiveDominance } from 'components/Charts'
import Filters, { FiltersWrapper } from 'components/Filters'
import { useDarkModeManager } from 'contexts/LocalStorage'
import { GeneralAreaChart } from 'components/TokenChart'
import { BreakpointPanels, BreakpointPanelsColumn, Panel } from 'components'
import IconsRow from 'components/IconsRow'
import { PeggedSearch } from 'components/Search/New'

function Chart({ peggedAreaChartData, peggedAssetNames, aspect }) {
  const [darkMode] = useDarkModeManager()
  const textColor = darkMode ? 'white' : 'black'
  return (
    <GeneralAreaChart
      aspect={aspect}
      finalChartData={peggedAreaChartData}
      tokensUnique={peggedAssetNames}
      textColor={textColor}
      color={'blue'}
      moneySymbol="$"
      formatDate={toNiceMonthlyDate}
      hallmarks={[]}
    />
  )
}

const PeggedTable = styled(Table)`
  tr > *:not(:first-child) {
    & > div {
      width: 100px;
      white-space: nowrap;
      overflow: hidden;
      font-weight: 400;
      margin-left: auto;
    }
  }

  // PEGGED NAME
  tr > *:nth-child(1) {
    & > div {
      width: 120px;
      overflow: hidden;
      white-space: nowrap;

      // HIDE LOGO
      & > *:nth-child(2) {
        display: none;
      }

      & > *:nth-child(3) {
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  }

  // CHAINS
  tr > *:nth-child(2) {
    display: none;
    & > div {
      width: 200px;
      overflow: hidden;
      white-space: nowrap;
    }
  }

  // PRICE
  tr > *:nth-child(3) {
    display: none;
  }

  // 1D CHANGE
  tr > *:nth-child(4) {
    display: none;
  }

  // 7D CHANGE
  tr > *:nth-child(5) {
    display: none;
  }

  // 1M CHANGE
  tr > *:nth-child(6) {
    display: none;
  }

  // MCAP
  tr > *:nth-child(7) {
    padding-right: 20px;
    & > div {
      text-align: right;
      margin-left: auto;
      white-space: nowrap;
      overflow: hidden;
    }
  }

  @media screen and (min-width: 360px) {
    // PEGGED NAME
    tr > *:nth-child(1) {
      & > div {
        width: 160px;
      }
    }
  }

  @media screen and (min-width: ${({ theme }) => theme.bpSm}) {
    // 7D CHANGE
    tr > *:nth-child(5) {
      display: revert;
    }
  }

  @media screen and (min-width: 640px) {
    // PEGGED NAME
    tr > *:nth-child(1) {
      & > div {
        width: 280px;
        // SHOW LOGO
        & > *:nth-child(2) {
          display: flex;
        }
      }
    }
  }

  @media screen and (min-width: 720px) {
    // 1M CHANGE
    tr > *:nth-child(6) {
      display: revert;
    }
  }

  @media screen and (min-width: ${({ theme }) => theme.bpMed}) {
    // PEGGED NAME
    tr > *:nth-child(1) {
      & > div {
        & > *:nth-child(4) {
          & > *:nth-child(2) {
            display: revert;
          }
        }
      }
    }
  }

  @media screen and (min-width: 900px) {
    // MCAP
    tr > *:nth-child(7) {
      padding-right: 0px;
    }
  }

  @media screen and (min-width: ${({ theme }) => theme.bpLg}) {
    // 1D CHANGE
    tr > *:nth-child(4) {
      display: none !important;
    }

    // MCAP
    tr > *:nth-child(7) {
      padding-right: 20px;
    }
  }

  @media screen and (min-width: 1200px) {
    // 1M CHANGE
    tr > *:nth-child(6) {
      display: revert !important;
    }
  }

  @media screen and (min-width: 1300px) {
    // PRICE
    tr > *:nth-child(3) {
      display: revert !important;
    }

    // 1D CHANGE
    tr > *:nth-child(4) {
      display: revert !important;
    }

    // MCAP
    tr > *:nth-child(7) {
      display: revert !important;
    }
  }

  @media screen and (min-width: 1536px) {
    // PEGGED NAME
    tr > *:nth-child(1) {
      & > div {
        width: 300px;
      }
    }

    // CHAINS
    tr > *:nth-child(2) {
      display: revert;
    }
  }
`

function PeggedAssetsOverview({
  title,
  category,
  selectedChain = 'All',
  chains = [],
  filteredPeggedAssets,
  chartData,
  peggedAreaChartData,
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
      Cell: ({ value }) => <IconsRow links={value} url="/peggedassets/stablecoins" iconType="chain" />,
    },
    {
      header: 'Price',
      accessor: 'price',
      Cell: ({ value }) => <>{value ? formattedPegggedPrice(value, true) : '-'}</>,
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

  const peggedAssetNames = useMemo(() => {
    return ['TOTAL', ...peggedTotals.map((peggedAsset) => peggedAsset.symbol)]
  }, [peggedTotals])

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
      <PeggedSearch step={{ category: 'Pegged Assets', name: title, route: 'peggedassets', hideOptions: true }} />

      <div>
        <BreakpointPanels>
          <BreakpointPanelsColumn gap="10px">{panels}</BreakpointPanelsColumn>
          <Panel style={{ height: '100%', minHeight: '347px', flex: 1, maxWidth: '100%' }}>
            <RowBetween mb={useMed ? 40 : 0} align="flex-start">
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
            {chartType === 'Area' && <Chart {...{ peggedAreaChartData, peggedAssetNames, aspect }} />}
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
            {chartType === 'Pie' && (
              <PeggedChainResponsivePie data={chainsCirculatingValues} chainColor={chainColor} aspect={aspect} />
            )}
          </Panel>
        </BreakpointPanels>
      </div>

      {showChainList && (
        <FiltersWrapper>
          <Filters filterOptions={chainOptions} activeLabel={selectedChain} />
        </FiltersWrapper>
      )}

      <PeggedTable data={peggedTotals} columns={columns} />
    </>
  )
}

export default PeggedAssetsOverview
