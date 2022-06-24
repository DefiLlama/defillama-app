import { useRef } from 'react'
import { Bookmark as BookmarkIcon } from 'react-feather'
import styled from 'styled-components'

import { useSavedProtocols } from 'contexts/LocalStorage'
import { useIsClient } from 'hooks'
import { standardizeProtocolName } from 'utils'

interface IWrapperProps {
  saved: boolean
}

const Wrapper = styled.button<IWrapperProps>`
  & > svg {
    fill: ${({ theme: { text1 }, saved }) => (saved ? text1 : 'none')};
    path {
      stroke: ${({ theme: { text1 } }) => text1};
    }
  }
`

// readableProtocolName has proper caps and spaces
function Bookmark({ readableProtocolName, ...props }) {
  const bookmarkRef = useRef(null)
  const { savedProtocols, addProtocol, removeProtocol } = useSavedProtocols()
  // isClient for local storage
  const isClient = useIsClient()

  const portfolios = Object.keys(savedProtocols)
  const protocolName = standardizeProtocolName(readableProtocolName)

  const isSaved: boolean = portfolios.some((portfolio) => savedProtocols[portfolio][protocolName]) && isClient

  const onClick = isSaved ? () => removeProtocol(readableProtocolName) : () => addProtocol(readableProtocolName)

  return (
    <Wrapper ref={bookmarkRef} onClick={onClick} saved={isSaved} {...props}>
      <span className="visually-hidden">{`Bookmark ${protocolName}`}</span>
      <BookmarkIcon width={16} height={16} />
    </Wrapper>
  )
}

export default Bookmark
