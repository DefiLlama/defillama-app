import { useRouter } from 'next/router'
import { useState } from 'react'
import { Bookmark, ChevronRight, X, ChevronUp, ChevronDown } from 'react-feather'
import styled from 'styled-components'

import { Hover } from 'components'
import { ButtonFaded } from 'components/ButtonStyled'
import { ColumnCenter, AutoColumn } from 'components/Column'
import FormattedName from 'components/FormattedName'
import { RowBetween, RowFixed } from 'components/Row'
import TokenLogo from 'components/TokenLogo'

import { useSavedProtocols } from 'contexts/LocalStorage'
import { TYPE } from 'Theme'
import { tokenIconUrl } from 'utils'

const RightColumn = styled.div`
  position: fixed;
  right: 0;
  top: 0px;
  height: calc(100vh - 2.5rem);
  width: ${({ open }) => (open ? '160px' : '23px')};
  padding: 1.25rem;
  border-left: ${({ theme, open }) => '1px solid' + theme.bg3};
  background-color: ${({ theme }) => theme.bg1};
  z-index: 9999;
  overflow: scroll;

  ::-webkit-scrollbar {
    display: none;
  }

  @media screen and (max-width: ${({ theme }) => theme.bpLg}) {
    display: none;
  }
`

const SavedButton = styled(RowBetween)`
  padding-bottom: ${({ open }) => open && '20px'};
  border-bottom: ${({ theme, open }) => open && '1px solid' + theme.bg3};
  margin-bottom: ${({ open }) => open && '1.25rem'};

  :hover {
    cursor: pointer;
  }
`

const ScrollableDiv = styled(AutoColumn)`
  overflow: auto;
`

const StyledChevronUp = styled(ChevronUp)`
  stroke: ${({ theme }) => theme.text1};
`

const StyledChevronDown = styled(ChevronDown)`
  stroke: ${({ theme }) => theme.text1};
`

const StyledIcon = styled.div`
  color: ${({ theme }) => theme.text2};
`

const PortfolioHeader = styled(RowBetween)`
  border-bottom: ${({ theme }) => '1px solid' + theme.bg3};
  padding: 1rem 0;
  margin-bottom: 1rem;
  cursor: pointer;
`

const PortfolioDropdown = ({ portfolio, removeProtocol, router, savedProtocols }) => {
  const [openPortfolio, setOpenPortfolio] = useState(portfolio === 'main')

  const togglePortfolio = () => (openPortfolio ? setOpenPortfolio(false) : setOpenPortfolio(true))

  return (
    <ColumnCenter style={{ marginBottom: '1rem' }}>
      <PortfolioHeader onClick={togglePortfolio}>
        <TYPE.main>{portfolio}</TYPE.main>
        {openPortfolio ? <StyledChevronUp /> : <StyledChevronDown />}
      </PortfolioHeader>
      {openPortfolio && (
        <ColumnCenter style={{ gap: '12px' }}>
          {Object.entries(savedProtocols[portfolio]).map(([protocol, readableProtocolName]) => (
            <RowBetween key={protocol}>
              <ButtonFaded onClick={() => router.push('/protocol/' + protocol)}>
                <RowFixed>
                  <TokenLogo logo={tokenIconUrl(protocol)} size={14} />
                  <TYPE.header ml={'6px'}>
                    <FormattedName text={readableProtocolName} maxCharacters={12} fontSize={'12px'} />
                  </TYPE.header>
                </RowFixed>
              </ButtonFaded>
              <Hover onClick={() => removeProtocol(protocol, portfolio)}>
                <StyledIcon>
                  <X size={16} />
                </StyledIcon>
              </Hover>
            </RowBetween>
          ))}
        </ColumnCenter>
      )}
    </ColumnCenter>
  )
}
function PinnedData() {
  const router = useRouter()
  const { savedProtocols, removeProtocol, pinnedOpen, setPinnedOpen } = useSavedProtocols()

  const portfolios = Object.keys(savedProtocols)

  const hasSaved = portfolios.some((portfolio) => Object.keys(savedProtocols[portfolio]).length)

  return !pinnedOpen ? (
    <RightColumn style={{ cursor: 'pointer' }} open={pinnedOpen} onClick={() => setPinnedOpen(true)}>
      <SavedButton open={pinnedOpen}>
        <StyledIcon>
          <Bookmark size={20} />
        </StyledIcon>
      </SavedButton>
    </RightColumn>
  ) : (
    <RightColumn gap="1rem" open={pinnedOpen}>
      <SavedButton onClick={() => setPinnedOpen(false)} open={pinnedOpen}>
        <RowFixed>
          <StyledIcon>
            <Bookmark size={16} />
          </StyledIcon>
          <TYPE.main ml={'4px'}>Saved</TYPE.main>
        </RowFixed>
        <StyledIcon>
          <ChevronRight />
        </StyledIcon>
      </SavedButton>
      <AutoColumn gap="40px">
        <ScrollableDiv>
          {hasSaved ? (
            portfolios.map((portfolio) => (
              <PortfolioDropdown
                removeProtocol={removeProtocol}
                router={router}
                savedProtocols={savedProtocols}
                portfolio={portfolio}
                key={portfolio}
              />
            ))
          ) : (
            <TYPE.light>Saved protocols will appear here.</TYPE.light>
          )}
        </ScrollableDiv>
      </AutoColumn>
    </RightColumn>
  )
}

export default PinnedData
