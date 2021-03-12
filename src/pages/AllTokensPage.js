import React, { useEffect } from 'react'
import 'feather-icons'

import TopTokenList from '../components/TokenList'
import { TYPE } from '../Theme'
import Panel from '../components/Panel'
import { useAllTokenData } from '../contexts/TokenData'
import { PageWrapper, FullWrapper } from '../components'
import { RowBetween } from '../components/Row'
import Search from '../components/Search'
import { useMedia } from 'react-use'

function AllTokensPage(props) {
  const { category } = props
  let allTokens = useAllTokenData()

  if (category) {
    allTokens = Object.entries(allTokens).filter(([key, token]) => token.category === category)
      .reduce((acc, curr) => {
        console.log(curr)
        acc[curr[0]] = curr[1];
        return acc
      }, {});
  }

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const below600 = useMedia('(max-width: 800px)')
  document.title = `TVL Rankings - Defi Llama`;

  return (
    <PageWrapper>
      <FullWrapper>
        <RowBetween>
          <TYPE.largeHeader>TVL Rankings</TYPE.largeHeader>
          {!below600 && <Search small={true} />}
        </RowBetween>
        <Panel style={{ marginTop: '6px', padding: below600 && '1rem 0 0 0 ' }}>
          <TopTokenList tokens={allTokens} itemMax={50} />
        </Panel>
      </FullWrapper>
    </PageWrapper>
  )
}

export default AllTokensPage
