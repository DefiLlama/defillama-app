import { useState, useRef, useEffect } from 'react'
import styled from 'styled-components'

import { BasicLink } from 'components/Link'
import Popover from 'components/Popover'
import Row from 'components/Row'
import TokenLogo from 'components/TokenLogo'

import { useResize, useNFTApp } from 'hooks'
import { tokenIconUrl } from 'utils'

const TOKEN_ICON_WIDTH = 24

const TokenCounter = styled(Row)`
  width: ${TOKEN_ICON_WIDTH}px;
  height: ${TOKEN_ICON_WIDTH}px;
  border-radius: 50%;
  background-color: ${({ theme: { bg3 } }) => bg3};
  justify-content: center;
`

export const TokenLogoWithLink = ({ token, isNFTApp }) => (
  <BasicLink key={token} href={isNFTApp ? `/nfts/marketplace/${token}` : `/protocol/${token}`}>
    <TokenLogo address={token} logo={tokenIconUrl(token)} />
  </BasicLink>
)

const TokensRow = ({ tokens }) => {
  const [visibleTokenIndex, setVisibileTokenIndex] = useState(0)
  const mainWrapEl = useRef(null)
  const { width: mainWrapWidth } = useResize(mainWrapEl)
  const [showHover, setShowHover] = useState(false)
  const isNFTApp = useNFTApp()

  useEffect(() => {
    let remainingWidth = (mainWrapWidth > 280 ? 280 : mainWrapWidth) - TOKEN_ICON_WIDTH
    let lastIndexOfFilters = 0

    tokens.forEach(() => {
      if (remainingWidth < 0) return
      remainingWidth -= TOKEN_ICON_WIDTH
      lastIndexOfFilters += 1
    })

    setVisibileTokenIndex(lastIndexOfFilters)
  }, [mainWrapWidth, tokens])

  const tooManyTokensIndex = visibleTokenIndex < tokens.length ? visibleTokenIndex - 1 : visibleTokenIndex
  const visibleTokens = tokens.slice(0, tooManyTokensIndex)
  const hoverTokens = tooManyTokensIndex !== visibleTokenIndex ? tokens.slice(tooManyTokensIndex, tokens.length) : []

  return (
    <Row sx={{ width: '100%', justifyContent: 'flex-end' }} ref={mainWrapEl}>
      {visibleTokens.map((token) => (
        <TokenLogoWithLink key={token} token={token} isNFTApp={isNFTApp} />
      ))}
      {!!hoverTokens.length && (
        <Popover
          show={showHover}
          content={
            <Row padding="6px">
              {hoverTokens.map((token) => (
                <TokenLogoWithLink key={token} token={token} isNFTApp={isNFTApp} />
              ))}
            </Row>
          }
        >
          <TokenCounter
            onMouseEnter={() => setShowHover(true)}
            onMouseLeave={() => setShowHover(false)}
          >{`+${hoverTokens.length}`}</TokenCounter>
        </Popover>
      )}
    </Row>
  )
}
export default TokensRow
