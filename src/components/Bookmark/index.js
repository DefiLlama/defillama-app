import { Bookmark as BookmarkIcon } from 'react-feather'
import styled from 'styled-components'

import { useSavedProtocols } from 'contexts/LocalStorage'
import { useIsClient } from 'hooks'
import { standardizeProtocolName } from 'utils'

const StyledBookmark = styled(BookmarkIcon)`
  cursor: pointer;
  fill: ${({ theme: { text1 }, isSaved }) => (isSaved ? text1 : 'none')};

  path {
    stroke: ${({ theme: { text1 } }) => text1};
  }
`
// readableProtocolName has proper caps and spaces
function Bookmark({ readableProtocolName, style }) {
  const { savedProtocols, addProtocol, removeProtocol } = useSavedProtocols()
  const isClient = useIsClient()

  // isClient for local storage
  const isSaved = savedProtocols[standardizeProtocolName(readableProtocolName)] && isClient

  return (
    <StyledBookmark
      isSaved={isSaved}
      onClick={isSaved ? () => removeProtocol(readableProtocolName) : () => addProtocol(readableProtocolName)}
      style={style}
    />
  )
}

export default Bookmark
