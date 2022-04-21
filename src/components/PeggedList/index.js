import React, { useMemo } from 'react'
import styled from 'styled-components'
import { Box } from 'rebass/styled-components'
import { PageWrapper, FullWrapper } from 'components'
import { AutoRow, RowBetween, RowFlat } from 'components/Row'
import Search from 'components/Search'
import Filters from 'components/Filters'
import { AllPeggedOptions } from 'components/SettingsModal'
import { getRandomColor } from 'utils'
import { useCalcCirculating } from 'hooks/peggedData'
import { useLg } from 'hooks/useBreakpoints'
import { TYPE } from 'Theme'
import Table, { columnsToShow, isOfTypeColumns } from 'components/Table'
import { PeggedChainPieChart, PeggedChainDominanceChart } from 'components/Charts'

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

function AllPeggedsPage({
  title,
  category,
  selectedChain = 'All',
  chains = [],
  filteredProtocols,
  showChainList = true,
  defaultSortingColumn,
}) {
  let columns = columnsToShow('protocolName', 'chains', 'circulating')
  const peggedColumn = `${category}`.toLowerCase()
  if (isOfTypeColumns(peggedColumn)) {
    columns = columnsToShow(peggedColumn, 'chains', 'circulating')
  }

  const isLg = useLg()
  const handleRouting = (chain) => {
    if (chain === 'All') return `/peggedassets/${category?.toLowerCase()}`
    return `/peggedassets/${category?.toLowerCase()}/${chain}`
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
      title = `${category} Circulating`
    }
  }

  return (
    <PageWrapper>
      <FullWrapper>
        <RowBetween>
          <TYPE.largeHeader>{title}</TYPE.largeHeader>
          <Search small={!isLg} />
        </RowBetween>
        <ChartsWrapper>
          <PeggedChainPieChart data={chainsTvlValues} chainColor={chainColor} />
          {/*
          <PeggedChainDominanceChart
            stackOffset="expand"
            formatPercent={true}
            stackedDataset={stackedData}
            asset={peggedasset}
            chainsUnique={chainsUnique}
            chainColor={chainColor}
            daySum={daySum}
  />*/}
        </ChartsWrapper>
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
