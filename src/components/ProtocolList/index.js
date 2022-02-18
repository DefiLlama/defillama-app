import React, { useMemo } from 'react'
import styled from 'styled-components'
import { PageWrapper, FullWrapper } from 'components'
import { AutoRow, RowBetween, RowFlat } from 'components/Row'
import Search from 'components/Search'
import Filters from 'components/Filters'

import { useCalcStakePool2Tvl } from 'hooks/data'
import { useLg } from 'hooks/useBreakpoints'
import { TYPE } from 'Theme'
import Table, { columnsToShow } from 'components/Table'

const ListOptions = styled(AutoRow)`
  height: 40px;
  width: 100%;
  font-size: 1.25rem;
  font-weight: 600;

  @media screen and (max-width: 640px) {
    font-size: 1rem;
  }
`

function AllTokensPage({
  title,
  category,
  selectedChain = 'All',
  chains = [],
  filteredProtocols,
  showChainList = true,
  defaultSortingColumn,
}) {
  const isLg = useLg()
  const handleRouting = (chain) => {
    if (chain === 'All') return `/protocols/${category?.toLowerCase()}`
    return `/protocols/${category?.toLowerCase()}/${chain}`
  }
  const chainOptions = ['All', ...chains].map((label) => ({ label, to: handleRouting(label) }))

  const protocols = useMemo(() => {
    if (category === 'Lending') {
      return filteredProtocols.map((p) => {
        const bTvl = p.extraTvl?.borrowed?.tvl ?? null
        const msizetvl = bTvl ? (bTvl + p.tvl) / p.tvl : null
        return { ...p, msizetvl }
      })
    } else return filteredProtocols
  }, [filteredProtocols, category])

  const protocolTotals = useCalcStakePool2Tvl(protocols, defaultSortingColumn)

  if (!title) {
    title = `TVL Rankings`
    if (category) {
      title = `${category} TVL Rankings`
    }
  }

  const columns = useMemo(() => {
    if (category === 'Lending') {
      return columnsToShow('protocolName', 'chains', '1dChange', '7dChange', '1mChange', 'tvl', 'mcaptvl', 'msizetvl')
    } else return columnsToShow('protocolName', 'chains', '1dChange', '7dChange', '1mChange', 'tvl', 'mcaptvl')
  }, [category])

  return (
    <PageWrapper>
      <FullWrapper>
        <RowBetween>
          <TYPE.largeHeader>{title}</TYPE.largeHeader>
          <Search small={!isLg} />
        </RowBetween>
        {showChainList && (
          <ListOptions gap="10px" style={{ marginTop: '2rem', marginBottom: '.5rem' }}>
            <RowBetween>
              <RowFlat style={{ width: '100%' }}>
                <Filters filterOptions={chainOptions} setActive={handleRouting} activeLabel={selectedChain} />
              </RowFlat>
            </RowBetween>
          </ListOptions>
        )}
        <Table data={protocolTotals} columns={columns} />
      </FullWrapper>
    </PageWrapper>
  )
}

export default AllTokensPage
