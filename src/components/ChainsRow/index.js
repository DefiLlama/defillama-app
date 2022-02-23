import { useState, useRef, useEffect } from 'react'
import styled from 'styled-components'

import { BasicLink } from 'components/Link'
import Popover from 'components/Popover'
import Row from 'components/Row'
import TokenLogo from 'components/TokenLogo'

import { useResize, useNFTApp } from 'hooks'
import { chainIconUrl } from 'utils'

const CHAIN_ICON_WIDTH = 24

const TokenCounter = styled(Row)`
  width: ${CHAIN_ICON_WIDTH}px;
  height: ${CHAIN_ICON_WIDTH}px;
  border-radius: 50%;
  background-color: ${({ theme: { bg3 } }) => bg3};
  justify-content: center;
`

export const ChainLogo = ({ chain, isNFTApp }) => (
  <BasicLink key={chain} href={isNFTApp ? `/nfts/chain/${chain}` : `/chain/${chain}`}>
    <TokenLogo address={chain} logo={chainIconUrl(chain)} />
  </BasicLink>
)

const ChainsRow = ({ chains }) => {
  const [visibleChainIndex, setVisibileChainIndex] = useState(0)
  const mainWrapEl = useRef(null)
  const { width: mainWrapWidth } = useResize(mainWrapEl)
  const [showHover, setShowHover] = useState(false)
  const isNFTApp = useNFTApp()

  useEffect(() => {
    let remainingWidth = (mainWrapWidth > 280 ? 280 : mainWrapWidth) - CHAIN_ICON_WIDTH
    let lastIndexOfFilters = 0

    chains.forEach(() => {
      if (remainingWidth < 0) return
      remainingWidth -= CHAIN_ICON_WIDTH
      lastIndexOfFilters += 1
    })

    setVisibileChainIndex(lastIndexOfFilters)
  }, [mainWrapWidth, chains])

  const tooManyChainsIndex = visibleChainIndex < chains.length ? visibleChainIndex - 1 : visibleChainIndex

  const visibleChains = chains.slice(0, tooManyChainsIndex)
  const hoverChains = tooManyChainsIndex !== visibleChainIndex ? chains.slice(tooManyChainsIndex, chains.length) : []

  return (
    <Row sx={{ width: '100%', justifyContent: 'flex-end' }} ref={mainWrapEl}>
      {visibleChains.map((chain) => (
        <ChainLogo key={chain} chain={chain} isNFTApp={isNFTApp} />
      ))}
      {!!hoverChains.length && (
        <Popover
          show={showHover}
          content={
            <Row padding="6px">
              {hoverChains.map((chain) => (
                <ChainLogo key={chain} chain={chain} isNFTApp={isNFTApp} />
              ))}
            </Row>
          }
        >
          <TokenCounter
            onMouseEnter={() => setShowHover(true)}
            onMouseLeave={() => setShowHover(false)}
          >{`+${hoverChains.length}`}</TokenCounter>
        </Popover>
      )}
    </Row>
  )
}
export default ChainsRow
