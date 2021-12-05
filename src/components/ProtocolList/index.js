import React from 'react'
import styled from 'styled-components'

import TokenList from 'components/TokenList'
import Panel from 'components/Panel'
import { PageWrapper, FullWrapper } from 'components'
import { AutoRow, RowBetween, RowFlat } from 'components/Row'
import Search from 'components/Search'
import Filters from 'components/Filters'

import { useCalcStakePool2Tvl } from 'hooks/data'
import { useLg } from 'hooks/useBreakpoints'
import { TYPE } from 'Theme'

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
  columns,
  defaultSortingColumn
}) {
  const isLg = useLg()
  const handleRouting = chain => {
    if (chain === 'All') return `/protocols/${category?.toLowerCase()}`
    return `/protocols/${category?.toLowerCase()}/${chain}`
  }
  const chainOptions = ['All', ...chains].map(label => ({ label, to: handleRouting(label) }))

  const protocolTotals = useCalcStakePool2Tvl(filteredProtocols, defaultSortingColumn)

  if (!title) {
    title = `TVL Rankings`
    if (category) {
      title = `${category} TVL Rankings`
    }
  }

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
        <Panel style={{ marginTop: '6px' }} sx={{ padding: ['1rem 0 0 0', '1.25rem'] }}>
          <TokenList
            tokens={protocolTotals}
            filters={[category, selectedChain]}
            columns={columns}
            defaultSortingColumn={defaultSortingColumn}
          />
        </Panel>
      </FullWrapper>
    </PageWrapper>
  )
}

export default AllTokensPage
