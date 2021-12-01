import { Bookmark as BookmarkIcon } from 'react-feather'
import styled from 'styled-components'

import { useSavedTokens } from 'contexts/LocalStorage'
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
  const { savedTokens, addToken, removeToken } = useSavedTokens()

  const isSaved = savedTokens[standardizeProtocolName(readableProtocolName)]
  console.log(isSaved, 'issaved')

  return (
    <StyledBookmark
      isSaved={isSaved}
      onClick={isSaved ? () => removeToken(readableProtocolName) : () => addToken(readableProtocolName)}
      style={style}
    />
  )
}

export default Bookmark
