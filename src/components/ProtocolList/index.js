import React, { useMemo } from 'react'
import { useCalcStakePool2Tvl } from 'hooks/data'
import { useLg } from 'hooks/useBreakpoints'
import { TYPE } from 'Theme'
import { PageWrapper, FullWrapper } from 'components'
import { RowBetween } from 'components/Row'
import Search from 'components/Search'
import Table, { columnsToShow } from 'components/Table'
import Filters, { FiltersWrapper } from 'components/Filters'

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
          <FiltersWrapper>
            <Filters filterOptions={chainOptions} activeLabel={selectedChain} />
          </FiltersWrapper>
        )}

        <Table data={protocolTotals} columns={columns} />
      </FullWrapper>
    </PageWrapper>
  )
}

export default AllTokensPage
