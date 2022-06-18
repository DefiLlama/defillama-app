import React, { useMemo, useState } from 'react'
import styled from 'styled-components'
import { DownloadCloud } from 'react-feather'
import { BreakpointPanel, BreakpointPanels, ChartAndValuesWrapper } from 'components'
import { OptionButton } from 'components/ButtonStyled'
import { RowBetween, AutoRow } from 'components/Row'
import PeggedViewSwitch from 'components/PeggedViewSwitch'
import Table, { columnsToShow } from 'components/Table'
import { PeggedChainResponsivePie, PeggedChainResponsiveDominance } from 'components/Charts'
import { GeneralAreaChart } from 'components/TokenChart'
import { PeggedAssetGroupOptions } from 'components/Select'
import { PeggedSearch } from 'components/Search'
import { useCalcCirculating, useCalcGroupExtraPeggedByDay, useGroupChainsPegged } from 'hooks/data'
import { useXl, useMed } from 'hooks/useBreakpoints'
import { useDarkModeManager } from 'contexts/LocalStorage'
import {
  getRandomColor,
  capitalizeFirstLetter,
  formattedNum,
  formattedPercent,
  getPercentChange,
  getPeggedDominance,
  toNiceMonthlyDate,
  toNiceCsvDate,
  download,
} from 'utils'

function Chart({ peggedAreaChainData, peggedAreaMcapData, totalMcapLabel, chainNames, aspect }) {
  const [darkMode] = useDarkModeManager()
  const textColor = darkMode ? 'white' : 'black'
  const finalChartData = peggedAreaChainData ? peggedAreaChainData : peggedAreaMcapData
  const labels = chainNames ? chainNames : totalMcapLabel
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

const AssetFilters = styled.div`
  margin: 12px 0 16px;

  & > h2 {
    margin: 0 2px 8px;
    font-weight: 600;
    font-size: 0.825rem;
    color: ${({ theme }) => theme.text1};
  }
`

const PeggedTable = styled(Table)`
  // PEGGED NAME
  tr > *:nth-child(1) {
    padding-left: 40px;

    & > * {
      width: 120px;
    }
  }

  // 7D CHANGE
  tr > *:nth-child(2) {
    display: none;
  }

  // MCAP
  tr > *:nth-child(3) {
    padding-right: 20px;
  }

  // DOMINANCE
  tr > *:nth-child(4) {
    display: none;
  }

  // MINTED
  tr > *:nth-child(5) {
    display: none;
  }

  // BRIDGEDTO
  tr > *:nth-child(6) {
    display: none;
  }

  // MCAPTVL
  tr > *:nth-child(7) {
    display: none;
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
    tr > *:nth-child(2) {
      display: revert;
    }
  }

  @media screen and (min-width: 640px) {
    // PEGGED NAME
    tr > *:nth-child(1) {
      & > * {
        width: 280px;
      }
    }
  }

  @media screen and (min-width: 720px) {
    // MCAP
    tr > *:nth-child(3) {
      padding-right: 0px;
    }

    // DOMINANCE
    tr > *:nth-child(4) {
      display: revert;
      padding-right: 20px;

      & > * {
        width: 140px;
      }
    }
  }

  @media screen and (min-width: 900px) {
    // DOMINANCE
    tr > *:nth-child(4) {
      display: revert;
    }

    // BRIDGEDTO
    tr > *:nth-child(6) {
      padding-right: 0px;
    }
  }

  @media screen and (min-width: ${({ theme }) => theme.bpLg}) {
    // MINTED
    tr > *:nth-child(5) {
      display: none !important;
    }

    // BRIDGEDTO
    tr > *:nth-child(6) {
      padding-right: 20px;
    }

    // MCAPTVL
    tr > *:nth-child(7) {
      display: none !important;
    }
  }

  @media screen and (min-width: 1200px) {
    // 7D CHANGE
    tr > *:nth-child(2) {
      display: revert !important;
    }
  }

  @media screen and (min-width: 1300px) {
    // DOMINANCE
    tr > *:nth-child(4) {
      padding-right: 0px;
    }

    // MINTED
    tr > *:nth-child(5) {
      display: revert !important;
    }

    // BRIDGEDTO
    tr > *:nth-child(6) {
      padding-right: 0px;
    }

    // MCAPTVL
    tr > *:nth-child(7) {
      display: revert !important;
    }
  }

  @media screen and (min-width: 1536px) {
    // BRIDGEDTO
    tr > *:nth-child(6) {
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
  ...columnsToShow('peggedAssetChain', '7dChange'),
  {
    header: 'Stables Mcap',
    accessor: 'mcap',
    Cell: ({ value }) => <>{value && formattedNum(value, true)}</>,
  },
  {
    header: 'Dominant Stablecoin',
    accessor: 'dominance',
    disableSortBy: true,
    Cell: ({ value }) => {
      return (
        <>
          {value && (
            <AutoRow sx={{ width: '100%', justifyContent: 'flex-end', gap: '4px' }}>
              <span>{`${value.name}: `}</span>
              <span>{formattedPercent(value.value, true)}</span>
            </AutoRow>
          )}
        </>
      )
    },
  },
  {
    header: 'Total Mcap Issued On',
    accessor: 'minted',
    Cell: ({ value }) => <>{value && formattedNum(value, true)}</>,
  },
  {
    header: 'Total Mcap Bridged To',
    accessor: 'bridgedTo',
    Cell: ({ value }) => <>{value && formattedNum(value, true)}</>,
  },
  {
    header: 'Stables Mcap/TVL',
    accessor: 'mcaptvl',
    Cell: ({ value }) => <>{value && formattedNum(value, false)}</>,
  },
]

function PeggedChainsOverview({
  title,
  category,
  chainCirculatings,
  chartData,
  peggedAreaChainData,
  peggedAreaMcapData,
  stackedDataset,
  peggedChartType,
  defaultSortingColumn,
  chainList,
  chainsGroupbyParent,
}) {
  const [chartType, setChartType] = useState(peggedChartType)

  const belowMed = useMed()
  const belowXl = useXl()
  const aspect = belowXl ? (belowMed ? 1 : 60 / 42) : 60 / 22

  const filteredPeggedAssets = chainCirculatings
  const chainTotals = useCalcCirculating(filteredPeggedAssets, defaultSortingColumn)

  const { data: stackedData, daySum } = useCalcGroupExtraPeggedByDay(stackedDataset)

  const downloadCsv = () => {
    const rows = [['Timestamp', 'Date', ...chainList]]
    stackedData
      .sort((a, b) => a.date - b.date)
      .forEach((day) => {
        rows.push([day.date, toNiceCsvDate(day.date), ...chainList.map((chain) => day[chain] ?? '')])
      })
    download('peggedAssetsChainTotals.csv', rows.map((r) => r.join(',')).join('\n'))
  }

  if (!title) {
    title = `Market Cap`
    if (category) {
      title = `${capitalizeFirstLetter(category)} Market Cap`
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

  let topChain = { name: 'Ethereum', mcap: 0 }
  if (chainTotals.length > 0) {
    const topChainData = chainTotals[0]
    topChain.name = topChainData.name
    topChain.mcap = topChainData.mcap
  }

  const dominance = getPeggedDominance(topChain, totalMcapCurrent)

  const totalMcapLabel = ['Total Stablecoins Market Cap']

  const groupedChains = useGroupChainsPegged(chainTotals, chainsGroupbyParent)

  const chainsCirculatingValues = useMemo(() => {
    const data = groupedChains.map((chain) => ({ name: chain.name, value: chain.mcap }))

    const otherCirculating = data.slice(10).reduce((total, entry) => {
      return (total += entry.value)
    }, 0)

    return data
      .slice(0, 10)
      .sort((a, b) => b.value - a.value)
      .concat({ name: 'Others', value: otherCirculating })
  }, [groupedChains])

  const chainColor = useMemo(
    () => Object.fromEntries([...chainTotals, 'Others'].map((chain) => [chain.name, getRandomColor()])),
    [chainTotals]
  )

  const groupedChainColor = useMemo(
    () => Object.fromEntries([...groupedChains, 'Others'].map((chain) => [chain.name, getRandomColor()])),
    [groupedChains]
  )

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
            <h2>{topChain.name} Dominance</h2>
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
          {chartType === 'Area' && <Chart {...{ peggedAreaChainData, chainNames: chainList, aspect }} />}
          {chartType === 'Dominance' && (
            <PeggedChainResponsiveDominance
              stackOffset="expand"
              formatPercent={true}
              stackedDataset={stackedData}
              chainsUnique={chainList}
              chainColor={chainColor}
              daySum={daySum}
              aspect={aspect}
            />
          )}
          {chartType === 'Pie' && (
            <PeggedChainResponsivePie data={chainsCirculatingValues} chainColor={groupedChainColor} aspect={aspect} />
          )}
        </BreakpointPanel>
      </ChartAndValuesWrapper>

      <AssetFilters>
        <h2>Filters</h2>
        <PeggedAssetGroupOptions label="Filters" />
      </AssetFilters>

      <PeggedTable data={groupedChains} columns={columns} />
    </>
  )
}

export default PeggedChainsOverview
