import { useRef } from 'react'
import { Bookmark as BookmarkIcon } from 'react-feather'
import styled from 'styled-components'

import { useSavedProtocols } from 'contexts/LocalStorage'
import { useIsClient } from 'hooks'
import { standardizeProtocolName } from 'utils'

const Wrapper = styled.button`
  background: none;
  padding: 0;
  border: none;
  margin: 0;

  & > svg {
    cursor: pointer;
    fill: ${({ theme: { text1 }, saved }) => (saved === 'true' ? text1 : 'none')};

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

  const isSaved = portfolios.some((portfolio) => savedProtocols[portfolio][protocolName]) && isClient

  const onClick = isSaved ? () => removeProtocol(readableProtocolName) : () => addProtocol(readableProtocolName)

  return (
    <Wrapper ref={bookmarkRef} onClick={onClick} saved={`${isSaved}`} {...props}>
      <BookmarkIcon saved={`${isSaved}`} width={16} height={16} />
    </Wrapper>
  )
}

export default Bookmark
