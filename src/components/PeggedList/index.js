import React, { useMemo, useState } from 'react'
import styled from 'styled-components'
import { DownloadCloud } from 'react-feather'
import { BreakpointPanel, BreakpointPanels, ChartAndValuesWrapper } from 'components'
import { OptionButton } from 'components/ButtonStyled'
import { RowBetween, AutoRow } from 'components/Row'
import PeggedViewSwitch from 'components/PeggedViewSwitch'
import Table, { columnsToShow } from 'components/Table'
import { PeggedChainResponsivePie, PeggedChainResponsiveDominance } from 'components/Charts'
import Filters, { FiltersWrapper } from 'components/Filters'
import { GeneralAreaChart } from 'components/TokenChart'
import IconsRow from 'components/IconsRow'
import { PeggedSearch } from 'components/Search'
import { useCalcCirculating, useCalcGroupExtraPeggedByDay } from 'hooks/data'
import { useXl, useMed } from 'hooks/useBreakpoints'
import { useDarkModeManager } from 'contexts/LocalStorage'
import {
  getRandomColor,
  capitalizeFirstLetter,
  formattedNum,
  formattedPegggedPrice,
  getPercentChange,
  getPeggedDominance,
  toNiceMonthlyDate,
  toNiceCsvDate,
  download,
} from 'utils'

function Chart({ peggedAreaChartData, peggedAreaMcapData, totalMcapLabel, peggedAssetNames, aspect }) {
  const [darkMode] = useDarkModeManager()
  const textColor = darkMode ? 'white' : 'black'
  const finalChartData = peggedAreaChartData ? peggedAreaChartData : peggedAreaMcapData
  const labels = peggedAssetNames ? peggedAssetNames : totalMcapLabel
  return (
    <GeneralAreaChart
      aspect={aspect}
      finalChartData={finalChartData}
      tokensUnique={labels}
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
    & > * {
      width: 100px;
      white-space: nowrap;
      overflow: hidden;
      font-weight: 400;
      margin-left: auto;
    }
  }

  // PEGGED NAME
  tr > *:nth-child(1) {
    & > * {
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
    & > * {
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
    & > * {
      text-align: right;
      margin-left: auto;
      white-space: nowrap;
      overflow: hidden;
    }
  }

  @media screen and (min-width: 360px) {
    // PEGGED NAME
    tr > *:nth-child(1) {
      & > * {
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
      & > * {
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
      & > * {
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
      & > * {
        width: 300px;
      }
    }

    // CHAINS
    tr > *:nth-child(2) {
      display: revert;
    }
  }
`

const Base = styled.button`
  padding: 8px 12px;
  font-size: 0.825rem;
  font-weight: 600;
  border-radius: 12px;
  cursor: pointer;
  outline: none;
  border: 1px solid transparent;
  outline: none;

  :focus-visible {
    outline: ${({ theme }) => '1px solid ' + theme.text4};
  }
`

const DownloadButton = styled(Base)`
  padding: 4px 6px;
  border-radius: 6px;
  background: ${({ theme }) => theme.bg3};
  color: ${({ theme }) => theme.text1};
  position: absolute;
  bottom: 8px;
  right: 8px;

  :focus-visible {
    outline: ${({ theme }) => '1px solid ' + theme.text4};
  }
`

const DownloadIcon = styled(DownloadCloud)`
  color: ${({ theme }) => theme.text1};
  position: relative;
  top: 2px;
  width: 20px;
  height: 20px;
`

const columns = [
  ...columnsToShow('peggedAsset'),
  {
    header: 'Chains',
    accessor: 'chains',
    disableSortBy: true,
    helperText: "Chains are ordered by pegged asset's issuance on each chain",
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

function PeggedAssetsOverview({
  title,
  category,
  selectedChain = 'All',
  chains = [],
  filteredPeggedAssets,
  chartData,
  peggedAreaChartData,
  peggedAreaMcapData,
  stackedDataset,
  peggedChartType,
  showChainList = true,
  defaultSortingColumn,
}) {
  const [chartType, setChartType] = useState(peggedChartType)

  const belowMed = useMed()
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
    return peggedTotals.map((peggedAsset) => peggedAsset.symbol)
  }, [peggedTotals])

  const { data: stackedData, daySum } = useCalcGroupExtraPeggedByDay(stackedDataset)

  const downloadCsv = () => {
    const rows = [['Timestamp', 'Date', ...peggedAssetNames]]
    stackedData
      .sort((a, b) => a.date - b.date)
      .forEach((day) => {
        rows.push([day.date, toNiceCsvDate(day.date), ...peggedAssetNames.map((peggedAsset) => day[peggedAsset] ?? '')])
      })
    download('peggedAssets.csv', rows.map((r) => r.join(',')).join('\n'))
  }

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

  const totalMcapLabel = ['Total Stablecoins Market Cap']

  return (
    <>
      <PeggedSearch step={{ category: 'Pegged Assets', name: title, route: 'peggedassets', hideOptions: true }} />

      <PeggedViewSwitch />

      <ChartAndValuesWrapper>
        <BreakpointPanels>
          <BreakpointPanel>
            <h1>Total {title}</h1>
            <p style={{ '--tile-text-color': '#4f8fea' }}>{mcapToDisplay}</p>
            <DownloadButton onClick={downloadCsv}>
              <DownloadIcon />
              <span>&nbsp;&nbsp;.csv</span>
            </DownloadButton>
          </BreakpointPanel>
          <BreakpointPanel>
            <h2>Change (24h)</h2>
            <p style={{ '--tile-text-color': '#fd3c99' }}> {percentChange || 0}%</p>
          </BreakpointPanel>
          <BreakpointPanel>
            <h2>{topToken.symbol} Dominance</h2>
            <p style={{ '--tile-text-color': '#46acb7' }}> {dominance}%</p>
          </BreakpointPanel>
        </BreakpointPanels>
        <BreakpointPanel id="chartWrapper">
          <RowBetween mb={useMed ? 40 : 0} align="flex-start">
            <AutoRow style={{ width: 'fit-content' }} justify="flex-end" gap="6px" align="flex-start">
              <OptionButton active={chartType === 'Mcap'} onClick={() => setChartType('Mcap')}>
                Total Mcap
              </OptionButton>
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
          {chartType === 'Mcap' && <Chart {...{ peggedAreaMcapData, totalMcapLabel, aspect }} />}
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
        </BreakpointPanel>
      </ChartAndValuesWrapper>

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
