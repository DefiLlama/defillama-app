import { useRef } from 'react'
import { Bookmark as BookmarkIcon } from 'react-feather'
import styled from 'styled-components'

import { useSavedProtocols } from 'contexts/LocalStorage'
import { useIsClient } from 'hooks'
import { standardizeProtocolName } from 'utils'

const StyledBookmark = styled(BookmarkIcon)`
  cursor: pointer;
  fill: ${({ theme: { text1 }, saved }) => (saved === 'true' ? text1 : 'none')};

  path {
    stroke: ${({ theme: { text1 } }) => text1};
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

  const isSaved = portfolios.some((portfolio) => savedProtocols[portfolio][protocolName]) && isClient

  const onClick = isSaved ? () => removeProtocol(readableProtocolName) : () => addProtocol(readableProtocolName)

  return <StyledBookmark ref={bookmarkRef} saved={`${isSaved}`} onClick={onClick} {...props} />
}

export default Bookmark
