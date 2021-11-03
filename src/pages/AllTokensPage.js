import React, { useEffect } from 'react'
import styled from 'styled-components'
import { useMedia } from 'react-use'
import { withRouter } from 'react-router-dom'

import DropdownSelect from 'components/DropdownSelect'
import TokenList from 'components/TokenList'
import Panel from 'components/Panel'
import { useAllTokenData } from 'contexts/TokenData'
import { PageWrapper, FullWrapper } from 'components'
import { AutoRow, RowBetween, RowFlat } from 'components/Row'
import Search from 'components/Search'
import { ButtonLight, ButtonDark } from 'components/ButtonStyled'
import { BasicLink } from 'components/Link'

import { TYPE } from 'Theme'

import { basicChainOptions, extraChainOptions, priorityDropdownOptions } from 'constants/chainTokens'

const ListOptions = styled(AutoRow)`
  height: 40px;
  width: 100%;
  font-size: 1.25rem;
  font-weight: 600;

  @media screen and (max-width: 640px) {
    font-size: 1rem;
  }
`

function AllTokensPage({ category, selectedChain = 'All', history }) {
  const below600 = useMedia('(max-width: 600px)')
  const below800 = useMedia('(max-width: 800px)')
  const below1400 = useMedia('(max-width: 1400px)')

  const handleRouting = chain => {
    if (chain === 'All') return `/protocols/${category}`
    if (!category) {
      return `/chains/${chain}`
    }
    return `/protocols/${category}/${chain}`
  }
  const setSelectedChain = newSelectedChain => history.push(handleRouting(newSelectedChain))

  const chainsSet = new Set([])
  let chainOptions = []
  if (below800) {
    chainOptions = [basicChainOptions[0], 'Others']
  } else if (below1400) {
    chainOptions = [...basicChainOptions, 'Others']
  } else {
    chainOptions = [...basicChainOptions, ...extraChainOptions, 'Others']
  }

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

  // remove duplicate chains
  chainOptions.concat(priorityDropdownOptions).forEach(chain => chainsSet.delete(chain))
  const otherChains = [...priorityDropdownOptions, ...Array.from(chainsSet)]

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
              {chainOptions.map((chain, i) => {
                if (chain === 'Others') {
                  return (
                    <DropdownSelect
                      key={chain}
                      options={otherChains.reduce(
                        (acc, item) => ({
                          ...acc,
                          [item]: item
                        }),
                        {}
                      )}
                      active={
                        chainOptions.includes(selectedChain) || selectedChain === undefined ? 'Other' : selectedChain
                      }
                      setActive={setSelectedChain}
                    />
                  )
                }
                if (selectedChain === chain) {
                  return (
                    <ButtonDark style={{ margin: '0.2rem' }} key={chain}>
                      {chain}
                    </ButtonDark>
                  )
                } else {
                  return (
                    <BasicLink to={handleRouting(chain)} key={chain}>
                      <ButtonLight style={{ margin: '0.2rem' }}>{chain}</ButtonLight>
                    </BasicLink>
                  )
                }
              })}
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

export default withRouter(AllTokensPage)
