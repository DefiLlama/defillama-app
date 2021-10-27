import React, { useEffect } from 'react'
import 'feather-icons'

import TokenList from '../components/TokenList'
import { TYPE } from '../Theme'
import Panel from '../components/Panel'
import { useAllTokenData } from '../contexts/TokenData'
import { PageWrapper, FullWrapper } from '../components'
import { RowBetween } from '../components/Row'
import Search from '../components/Search'
import { useMedia } from 'react-use'

function AllTokensPage(props) {
  const { category, categoryName } = props
  let allTokens = Object.values(useAllTokenData()).map(token => ({
    ...token,
    mcaptvl: (token.tvl !== 0 && token.mcap) ? token.mcap / token.tvl : null,
    fdvtvl: (token.tvl !== 0 && token.fdv) ? token.fdv / token.tvl : null,
  }))

  if (category) {
    allTokens = allTokens.filter((token) => (token.category || '').toLowerCase() === category.toLowerCase() && token.category !== "Chain")
  } else {
    allTokens = allTokens.filter((token) => token.category !== "Chain")
  }

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const below600 = useMedia('(max-width: 800px)')
  let title = `TVL Rankings`
  if (categoryName) {
    title = `${categoryName} TVL Rankings`
  }
  document.title = `${title} - Defi Llama`;

  return (
    <PageWrapper>
      <FullWrapper>
        <RowBetween>
          <TYPE.largeHeader>{title}</TYPE.largeHeader>
          {!below600 && <Search small={true} />}
        </RowBetween>
        <Panel style={{ marginTop: '6px', padding: below600 && '1rem 0 0 0 ' }}>
          <TokenList tokens={allTokens} />
        </Panel>
      </FullWrapper>
    </PageWrapper>
  )
}

export default AllTokensPage
