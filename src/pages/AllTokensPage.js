import React, { useEffect } from 'react'
import styled from 'styled-components'
import { useMedia } from 'react-use'

import TokenList from 'components/TokenList'
import Panel from 'components/Panel'
import { useAllTokenData } from 'contexts/TokenData'
import { PageWrapper, FullWrapper } from 'components'
import { AutoRow, RowBetween, RowFlat } from 'components/Row'
import Search from 'components/Search'
import Filters from 'components/Filters'

import { TYPE } from 'Theme'

import { priorityChainFilters } from 'constants/chainTokens'

const ListOptions = styled(AutoRow)`
  height: 40px;
  width: 100%;
  font-size: 1.25rem;
  font-weight: 600;

  @media screen and (max-width: 640px) {
    font-size: 1rem;
  }
`

function AllTokensPage({ category, selectedChain = 'All' }) {
  const below600 = useMedia('(max-width: 600px)')

  const handleRouting = chain => {
    if (chain === 'All') return `/protocols/${category}`
    if (!category) {
      return `/chains/${chain}`
    }
    return `/protocols/${category}/${chain}`
  }
  const setSelectedChain = newSelectedChain => handleRouting(newSelectedChain)

  const chainsSet = new Set(priorityChainFilters)

  let allTokens = Object.values(useAllTokenData())
  if (category) {
    allTokens = allTokens.filter(
      token => (token.category || '').toLowerCase() === category.toLowerCase() && token.category !== 'Chain'
    )
  } else {
    allTokens = allTokens.filter(token => token.category !== 'Chain')
  }

  allTokens = allTokens
    .map(token => {
      // Populate chain dropdown options
      token.chains.forEach(chain => {
        chainsSet.add(chain)
      })
      if (selectedChain !== 'All') {
        const chainTvl = token.chainTvls[selectedChain]

        if (chainTvl === undefined) {
          return null
        }

        if (token.chains.length > 1) {
          // do not return mcap/tvl for specific chain since tvl is spread accross chains
          return {
            ...token,
            tvl: chainTvl
          }
        }
      }
      // if only chain return the full mcap/tvl or All selected
      return {
        ...token,
        mcaptvl: token.tvl !== 0 && token.mcap ? token.mcap / token.tvl : null,
        fdvtvl: token.tvl !== 0 && token.fdv ? token.fdv / token.tvl : null
      }
    })
    .filter(token => token !== null)

  let chainOptions = [...chainsSet].map(label => ({ label, to: handleRouting(label) }))

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [category])

  let title = `TVL Rankings`
  if (category) {
    title = `${category} TVL Rankings`
  }
  document.title = `${title} - Defi Llama`

  return (
    <PageWrapper>
      <FullWrapper>
        <RowBetween>
          <TYPE.largeHeader>{title}</TYPE.largeHeader>
          {!below600 && <Search small={true} />}
        </RowBetween>
        <ListOptions gap="10px" style={{ marginTop: '2rem', marginBottom: '.5rem' }}>
          <RowBetween>
            <RowFlat>
              <Filters filterOptions={chainOptions} setActive={setSelectedChain} />
            </RowFlat>
          </RowBetween>
        </ListOptions>
        <Panel style={{ marginTop: '6px', padding: below600 && '1rem 0 0 0 ' }}>
          <TokenList tokens={allTokens} filters={[category, selectedChain]} />
        </Panel>
      </FullWrapper>
    </PageWrapper>
  )
}

export default AllTokensPage
