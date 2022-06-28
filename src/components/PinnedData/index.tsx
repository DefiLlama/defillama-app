import { useState } from 'react'
import { useRouter } from 'next/router'
import { Bookmark, ChevronRight, X, ChevronUp, ChevronDown } from 'react-feather'
import styled from 'styled-components'
import { TYPE } from '~/Theme'
import { ButtonFaded } from '~/components/ButtonStyled'
import FormattedName from '~/components/FormattedName'
import TokenLogo from '~/components/TokenLogo'
import { useSavedProtocols } from '~/contexts/LocalStorage'
import { tokenIconUrl } from '~/utils'

interface IButton {
  open?: boolean
}

interface IWrapper {
  open: boolean
  gap?: string
}

const Wrapper = styled.section<IWrapper>`
  padding: 1.25rem;
  border-left: ${({ theme }) => '1px solid' + theme.bg3};
  background-color: ${({ theme }) => theme.bg1};
  z-index: 1;
  overflow: scroll;
  display: none;

  ::-webkit-scrollbar {
    display: none;
  }

  @media screen and (min-width: ${({ theme }) => theme.bpLg}) {
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0;
    bottom: 0;
    right: 0;
    width: fit-content;
    overflow-y: auto;
  }
`

const Button = styled.button<IButton>`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  color: ${({ theme }) => theme.text1};
  gap: 4px;
  overflow: hidden:
  text-overflow: truncate;

  & > svg {
    color: ${({ theme }) => theme.text2};
    flex-shrink: 0;
  }
  
  :focus-visible {
    background: ${({ theme }) => theme.bg3};
  }
`

const ScrollableDiv = styled.div`
  display: flex;
  flex-direction: column;
  overflow: auto;
`

const PortfolioHeader = styled(Button)`
  border-bottom: ${({ theme }) => '1px solid' + theme.bg3};
  padding: 1rem 0;
  margin: 1rem 0;

  & > svg {
    color: ${({ theme }) => theme.text1};
  }
`

const PortfolioList = styled.ul`
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;

  & > li {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;

    & > button:first-child {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      gap: 4px;

      :focus-visible {
        background: ${({ theme }) => theme.bg3};
      }

      & > *:first-child {
        flex-shrink: 0;
      }

      & > *:nth-child(2) {
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  }
`

const PortfolioDropdown = ({ portfolio, removeProtocol, router, savedProtocols }) => {
  const [openPortfolio, setOpenPortfolio] = useState(portfolio === 'main')

  const togglePortfolio = () => (openPortfolio ? setOpenPortfolio(false) : setOpenPortfolio(true))

  return (
    <>
      <PortfolioHeader onClick={togglePortfolio}>
        <span>{portfolio}</span>
        {openPortfolio ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </PortfolioHeader>
      {openPortfolio && (
        <PortfolioList>
          {Object.entries(savedProtocols[portfolio]).map(([protocol, readableProtocolName]: [string, string]) => (
            <li key={protocol}>
              <ButtonFaded onClick={() => router.push('/protocol/' + protocol)}>
                <TokenLogo logo={tokenIconUrl(protocol)} size={14} />
                <FormattedName text={readableProtocolName} maxCharacters={12} fontSize={'12px'} />
              </ButtonFaded>
              <Button onClick={() => removeProtocol(protocol, portfolio)}>
                <X size={16} />
              </Button>
            </li>
          ))}
        </PortfolioList>
      )}
    </>
  )
}

function PinnedData() {
  const router = useRouter()
  const { savedProtocols, removeProtocol, pinnedOpen, setPinnedOpen } = useSavedProtocols()

  const portfolios = Object.keys(savedProtocols)

  const hasSaved = portfolios.some((portfolio) => Object.keys(savedProtocols[portfolio]).length)

  return (
    <>
      {!pinnedOpen ? (
        <Wrapper style={{ cursor: 'pointer' }} open={pinnedOpen} onClick={() => setPinnedOpen(true)}>
          <Button open={pinnedOpen}>
            <Bookmark size={20} />
          </Button>
        </Wrapper>
      ) : (
        <Wrapper gap="1rem" open={pinnedOpen}>
          <Button onClick={() => setPinnedOpen(false)} open={pinnedOpen}>
            <Bookmark size={16} />
            <span style={{ marginRight: '12px' }}>Saved</span>
            <ChevronRight size={18} />
          </Button>

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
              <TYPE.light style={{ margin: '20px 0' }}>Saved protocols will appear here.</TYPE.light>
            )}
          </ScrollableDiv>
        </Wrapper>
      )}
    </>
  )
}

export default PinnedData
