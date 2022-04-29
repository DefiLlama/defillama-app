import React, { useMemo } from 'react'
import styled from 'styled-components'
import { Box } from 'rebass/styled-components'
import Panel from '../Panel'
import { AutoColumn } from '../Column'
import { PageWrapper, FullWrapper } from 'components'
import { AutoRow, RowBetween, RowFlat } from 'components/Row'
import Search from 'components/Search'
import Filters from 'components/Filters'
import { AllPeggedOptions } from 'components/SettingsModal'
import {
  getRandomColor,
  capitalizeFirstLetter,
  formattedNum,
  getPercentChange,
  getPrevCirculatingFromChart,
  getPeggedDominance,
} from 'utils'
import { useCalcCirculating } from 'hooks/peggedData'
import { useLg } from 'hooks/useBreakpoints'
import { TYPE } from 'Theme'
import Table, { columnsToShow, isOfTypeColumns } from 'components/Table'
import { PeggedChainPieChart, PeggedChainDominanceChart } from 'components/Charts'
import { categoryToPegType } from 'utils/peggedDataApi'

const ListOptions = styled(AutoRow)`
  height: 40px;
  width: 100%;
  font-size: 1.25rem;
  font-weight: 600;

  @media screen and (max-width: 640px) {
    font-size: 1rem;
  }
`
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
  filteredProtocols,
  chartData,
  showChainList = true,
  defaultSortingColumn,
}) {
  let columns = columnsToShow(
    'protocolName',
    'peggedChains',
    'price',
    '1dChange',
    '7dChange',
    '1mChange',
    'circulating'
  )
  const peggedColumn = `${category}`
  if (isOfTypeColumns(peggedColumn)) {
    columns = columnsToShow(peggedColumn, 'price', 'peggedChains', '1dChange', '7dChange', '1mChange', 'circulating')
  }

  const isLg = useLg()
  const handleRouting = (chain) => {
    if (chain === 'All') return `/peggedassets/${category}`
    return `/peggedassets/${category}/${chain}`
  }
  const chainOptions = ['All', ...chains].map((label) => ({ label, to: handleRouting(label) }))

  const peggedTotals = useCalcCirculating(filteredProtocols, defaultSortingColumn)

  const chainsTvlValues = useMemo(() => {
    const data = peggedTotals.map((chain) => ({ name: chain.name, value: chain.circulating }))

    const otherTvl = data.slice(10).reduce((total, entry) => {
      return (total += entry.value)
    }, 0)

    return data
      .slice(0, 10)
      .sort((a, b) => b.value - a.value)
      .concat({ name: 'Others', value: otherTvl })
  }, [peggedTotals])

  const chainColor = useMemo(
    () => Object.fromEntries([...peggedTotals, 'Others'].map((chain) => [chain.name, getRandomColor()])),
    [filteredProtocols]
  )

  if (!title) {
    title = `Circulating`
    if (category) {
      title = `${capitalizeFirstLetter(category)} Circulating`
    }
    if (selectedChain !== "All") {
      title = `${capitalizeFirstLetter(selectedChain)} ${capitalizeFirstLetter(category)} Circulating`
    }
  }

  // can add uncirculating hook here
  const { tvl, percentChange } = useMemo(() => {
    const tvl = getPrevCirculatingFromChart(chartData, 0, 'totalCirculating', categoryToPegType[category])
    const tvlPrevDay = getPrevCirculatingFromChart(chartData, 1, 'totalCirculating', categoryToPegType[category])
    const percentChange = getPercentChange(tvl, tvlPrevDay)?.toFixed(2)

    return { tvl, percentChange }
  }, [chartData])

  const tvlToDisplay = formattedNum(tvl, true)

  const topToken = { name: 'Tether', circulating: 0 }
  if (peggedTotals.length > 0) {
    topToken.name = peggedTotals[0]?.name
    topToken.circulating = peggedTotals[0]?.circulating
  }

  const dominance = getPeggedDominance(topToken, tvl)

  const panels = (
    <>
      <Panel style={{ padding: '18px 25px', justifyContent: 'center' }}>
        <AutoColumn gap="4px">
          <RowBetween>
            <TYPE.heading>Total {title}</TYPE.heading>
          </RowBetween>
          <RowBetween style={{ marginTop: '4px', marginBottom: '-6px' }} align="flex-end">
            <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#4f8fea'}>
              {tvlToDisplay}
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
            <PeggedChainPieChart data={chainsTvlValues} chainColor={chainColor} />
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
