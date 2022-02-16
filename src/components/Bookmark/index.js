import { transparentize } from 'polished'
import { useState, useEffect, useRef } from 'react'
import { Bookmark as BookmarkIcon, Plus, Check } from 'react-feather'
import styled from 'styled-components'

import Column from 'components/Column'
import Popover from 'components/Popover'
import { RowBetween } from 'components/Row'

import { useSavedProtocols } from 'contexts/LocalStorage'
import { useIsClient } from 'hooks'
import { standardizeProtocolName } from 'utils'
import { TYPE } from 'Theme'

const StyledBookmark = styled(BookmarkIcon)`
  cursor: pointer;
  fill: ${({ theme: { text1 }, saved }) => (saved === 'true' ? text1 : 'none')};

  path {
    stroke: ${({ theme: { text1 } }) => text1};
  }
`

const PortfolioMenuWrapper = styled(Column)`
  min-width: 250px;
`

const PortfolioMenuRow = styled(RowBetween)`
  padding: 1rem;

  cursor: pointer;
  &:hover {
    background-color: ${({ color, theme }) =>
      color ? transparentize(0.9, color) : transparentize(0.9, theme.primary1)};
  }
`

const BlueCheck = styled(Check)`
  polyline {
    stroke: ${({ theme: { primary1 } }) => primary1};
  }
`

const PortfolioMenu = ({
  portfolios,
  protocolName,
  readableProtocolName,
  savedProtocols,
  addProtocol,
  removeProtocol,
  setOpenPortfolioMenu,
}) => {
  return (
    <PortfolioMenuWrapper>
      {portfolios.map((portfolio) => {
        const protocolAdded = savedProtocols[portfolio][protocolName]
        const onClick = () => {
          if (protocolAdded) {
            removeProtocol(readableProtocolName, portfolio)
          } else {
            addProtocol(readableProtocolName, portfolio)
          }
          setOpenPortfolioMenu(false)
        }
        return (
          <PortfolioMenuRow key={portfolio} onClick={onClick}>
            <TYPE.main>{portfolio}</TYPE.main>
            {protocolAdded ? <BlueCheck /> : <Plus />}
          </PortfolioMenuRow>
        )
      })}
    </PortfolioMenuWrapper>
  )
}

// readableProtocolName has proper caps and spaces
function Bookmark({ readableProtocolName, ...props }) {
  const bookmarkRef = useRef(null)
  const [openPortfolioMenu, setOpenPortfolioMenu] = useState(false)
  const { savedProtocols, addProtocol, removeProtocol } = useSavedProtocols()
  // isClient for local storage
  const isClient = useIsClient()

  useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.contains(bookmarkRef.current) && !e.target.contains(bookmarkRef.current.firstChild)) {
        setOpenPortfolioMenu(false)
      }
    }
    window.addEventListener('click', handleClick)
    return () => {
      window.removeEventListener('click', handleClick)
    }
  }, [])

  const portfolios = Object.keys(savedProtocols)
  const protocolName = standardizeProtocolName(readableProtocolName)

  const isSaved = portfolios.some((portfolio) => savedProtocols[portfolio][protocolName]) && isClient

  const hasManyPortfolios = portfolios.length > 1

  const onClick =
    portfolios.length === 1
      ? isSaved
        ? () => removeProtocol(readableProtocolName)
        : () => addProtocol(readableProtocolName)
      : () => setOpenPortfolioMenu(true)

  // return (
  //   <Popover
  //     arrow={false}
  //     show={openPortfolioMenu && hasManyPortfolios}
  //     content={
  //       <PortfolioMenu
  //         addProtocol={addProtocol}
  //         portfolios={portfolios}
  //         protocolName={protocolName}
  //         readableProtocolName={readableProtocolName}
  //         removeProtocol={removeProtocol}
  //         savedProtocols={savedProtocols}
  //         setOpenPortfolioMenu={setOpenPortfolioMenu}
  //       />
  //     }
  //   >
  //     <StyledBookmark ref={bookmarkRef} saved={`${isSaved}`} onClick={onClick} {...props} />
  //   </Popover>
  // )

  return <StyledBookmark ref={bookmarkRef} saved={`${isSaved}`} onClick={onClick} {...props} />
}

export default Bookmark
