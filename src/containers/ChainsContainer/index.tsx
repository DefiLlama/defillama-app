import React, { useMemo } from 'react'
import { Box } from 'rebass/styled-components'
import styled from 'styled-components'
import { Header } from 'Theme'
import { PageWrapper, FullWrapper } from 'components'
import { ButtonDark } from 'components/ButtonStyled'
import { RowBetween } from 'components/Row'
import Search from 'components/Search'
import { ChainPieChart, ChainDominanceChart } from 'components/Charts'
import { columnsToShow, FullTable } from 'components/Table'
import { toNiceCsvDate, getRandomColor, download } from 'utils'
import { getChainsPageData, revalidate } from 'utils/dataApi'
import { useCalcGroupExtraTvlsByDay, useCalcStakePool2Tvl, useGroupChainsByParent } from 'hooks/data'
import Filters, { FiltersWrapper } from 'components/Filters'
import { ChainsTvlSelect } from 'components/Select'

export async function getStaticProps() {
  const data = await getChainsPageData('All')
  return {
    ...data,
    revalidate: revalidate(),
  }
}

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
  margin-top: 16px;
  @media (max-width: 680px) {
    gap: 16px;
  }
`

interface ITable {
  showByGroup?: boolean
}

const StyledTable = styled(FullTable)<ITable>`
  tr > *:not(:first-child) {
    & > div {
      width: 100px;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-left: auto;
      font-weight: 400;
    }
  }

  // CHAIN
  tr > :nth-child(1) {
    padding-left: ${({ showByGroup }) => (showByGroup ? '40px' : '20px')};

    & > div {
      // LOGO
      & > div {
        display: none;
      }

      & > a {
        width: 60px;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;

        // SYMBOL
        & > *:nth-child(2) {
          display: none;
        }
      }
    }
  }

  // PROTOCOLS
  tr > :nth-child(2) {
    width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: none;
  }

  // 1D CHANGE
  tr > :nth-child(3) {
    display: none;
  }

  // 7D CHANGE
  tr > :nth-child(4) {
    display: none;
  }

  // 1M CHANGE
  tr > :nth-child(5) {
    display: none;
  }

  // TVL
  tr > :nth-child(6) {
    & > div {
      padding-right: 20px;
    }
  }

  // MCAPTVL
  tr > :nth-child(7) {
    width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: none;
  }

  @media screen and (min-width: ${({ theme }) => theme.bpSm}) {
    // CHAIN
    tr > *:nth-child(1) {
      & > div {
        & > a {
          width: 100px;
        }
      }
    }

    // 7D CHANGE
    tr > *:nth-child(4) {
      display: revert;
    }
  }

  @media screen and (min-width: 640px) {
    // CHAIN
    tr > *:nth-child(1) {
      & > div {
        // LOGO
        & > div {
          display: revert;
        }
      }
    }

    // PROTOCOLS
    tr > :nth-child(2) {
      display: revert;
    }
  }

  @media screen and (min-width: ${({ theme }) => theme.bpMed}) {
    // CHAIN
    tr > *:nth-child(1) {
      & > div {
        & > a {
          width: 140px;

          // SYMBOL
          & > *:nth-child(2) {
            display: revert;
          }
        }
      }
    }

    // 1M CHANGE
    tr > *:nth-child(5) {
      display: revert;
    }
  }

  @media screen and (min-width: ${({ theme }) => theme.bpLg}) {
    // 1M CHANGE
    tr > *:nth-child(5) {
      display: none;
    }
  }

  @media screen and (min-width: 1260px) {
    // CHAIN
    tr > *:nth-child(1) {
      & > div {
        & > a {
          width: 200px;
        }
      }
    }

    // 1M CHANGE
    tr > *:nth-child(5) {
      display: revert;
    }
  }

  @media screen and (min-width: 1360px) {
    // 1D CHANGE
    tr > *:nth-child(3) {
      display: revert;
    }
  }

  @media screen and (min-width: 1400px) {
    // MCAPTVL
    tr > *:nth-child(7) {
      display: revert;
    }
  }
`
const ChainTvlsFilter = styled.div`
  margin: 12px 0 16px;
  & > h2 {
    margin: 0 2px 8px;
    font-weight: 600;
    font-size: 0.825rem;
    color: ${({ theme }) => theme.text1};
  }
`

const columns = columnsToShow('chainName', 'protocols', '1dChange', '7dChange', '1mChange', 'tvl', 'mcaptvl')

export default function ChainsContainer({
  chainsUnique,
  chainTvls,
  stackedDataset,
  category,
  categories,
  chainsGroupbyParent,
}) {
  const chainColor = useMemo(
    () => Object.fromEntries([...chainsUnique, 'Others'].map((chain) => [chain, getRandomColor()])),
    [chainsUnique]
  )

  const chainTotals = useCalcStakePool2Tvl(chainTvls, undefined, undefined, true)

  const chainsTvlValues = useMemo(() => {
    const data = chainTotals.map((chain) => ({ name: chain.name, value: chain.tvl }))

    const otherTvl = data.slice(10).reduce((total, entry) => {
      return (total += entry.value)
    }, 0)

    return data
      .slice(0, 10)
      .sort((a, b) => b.value - a.value)
      .concat({ name: 'Others', value: otherTvl })
  }, [chainTotals])

  const { data: stackedData, daySum } = useCalcGroupExtraTvlsByDay(stackedDataset)

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

  const groupedChains = useGroupChainsByParent(chainTotals, showByGroup ? chainsGroupbyParent : {})

  return (
    <PageWrapper>
      <FullWrapper>
        <Search />

        <RowWrapper>
          <Header>Total Value Locked All Chains</Header>
          <ButtonDark onClick={downloadCsv}>Download all data in .csv</ButtonDark>
        </RowWrapper>

        <ChartsWrapper>
          <ChainPieChart data={chainsTvlValues} chainColor={chainColor} />
          <ChainDominanceChart
            stackOffset="expand"
            formatPercent={true}
            stackedDataset={stackedData}
            chainsUnique={chainsUnique}
            chainColor={chainColor}
            daySum={daySum}
          />
        </ChartsWrapper>

        <ChainTvlsFilter>
          <h2>Filters</h2>
          <ChainsTvlSelect label="Filters" />
        </ChainTvlsFilter>

        <FiltersWrapper>
          <Filters filterOptions={categories} activeLabel={category} />
        </FiltersWrapper>

        <StyledTable data={groupedChains} columns={columns} showByGroup={showByGroup} />
      </FullWrapper>
    </PageWrapper>
  )
}
