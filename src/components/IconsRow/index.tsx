import { useEffect, useRef, useState } from 'react'
import { Hovercard, HovercardAnchor, useHovercardState } from 'ariakit/hovercard'
import styled from 'styled-components'
import { BasicLink } from 'components/Link'
import TokenLogo from 'components/TokenLogo'
import { useResize } from 'hooks'
import { chainIconUrl, tokenIconUrl } from 'utils'

const CHAIN_ICON_WIDTH = 24

const TokenCounter = styled.button`
  width: ${CHAIN_ICON_WIDTH}px;
  height: ${CHAIN_ICON_WIDTH}px;
  border-radius: 50%;
  background: ${({ theme }) => theme.bg3};
  color: ${({ theme }) => theme.text1};
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;

  :focus-visible {
    outline: ${({ theme }) => '1px solid ' + theme.text4};
  }
`

const Row = styled.span`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1px;
  background: none;
`

const Popover = styled(Hovercard)`
  z-index: 1;
  padding: 4px;
  background: ${({ theme }) => theme.bg2};
  border: 1px solid ${({ theme }) => theme.bg3};
  color: ${({ theme }) => theme.text1};
  border-radius: 8px;
  box-shadow: ${({ theme }) => theme.shadowSm};
`

export const ChainLogo = ({ chain, url, iconType }) => {
  return (
    <BasicLink key={chain} href={`${url}/${chain}`}>
      <TokenLogo address={chain} logo={iconType === 'token' ? tokenIconUrl(chain) : chainIconUrl(chain)} />
    </BasicLink>
  )
}

interface IIconsRowProps {
  links: string[]
  url: string
  iconType: 'token' | 'chain'
}
// TODO copy components/Filters code and fix flashing
const IconsRow = ({ links, url, iconType }: IIconsRowProps) => {
  const [visibleChainIndex, setVisibileChainIndex] = useState(0)
  const mainWrapEl = useRef(null)
  const { width: mainWrapWidth } = useResize(mainWrapEl)

  useEffect(() => {
    let remainingWidth = (mainWrapWidth > 280 ? 280 : mainWrapWidth) - CHAIN_ICON_WIDTH
    let lastIndexOfFilters = 0

    links.forEach(() => {
      if (remainingWidth < 0) return
      remainingWidth -= CHAIN_ICON_WIDTH
      lastIndexOfFilters += 1
    })

    setVisibileChainIndex(lastIndexOfFilters)
  }, [mainWrapWidth, links])

  const tooManyChainsIndex = visibleChainIndex < links.length ? visibleChainIndex - 1 : visibleChainIndex

  const visibleChains = links.slice(0, tooManyChainsIndex)
  const hoverChains = tooManyChainsIndex !== visibleChainIndex ? links.slice(tooManyChainsIndex, links.length) : []

  const hovercard = useHovercardState()

  return (
    <Row ref={mainWrapEl}>
      {visibleChains.map((chain) => (
        <ChainLogo key={chain} chain={chain} url={url} iconType={iconType} />
      ))}
      {!!hoverChains.length && (
        <>
          <HovercardAnchor state={hovercard}>
            <TokenCounter>{`+${hoverChains.length}`}</TokenCounter>
          </HovercardAnchor>
          <Popover state={hovercard}>
            {
              <Row>
                {hoverChains.map((chain) => (
                  <ChainLogo key={chain} chain={chain} url={url} iconType={iconType} />
                ))}
              </Row>
            }
          </Popover>
        </>
      )}
    </Row>
  )
}
export default IconsRow
