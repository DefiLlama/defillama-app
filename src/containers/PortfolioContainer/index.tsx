import { useMemo } from 'react'
import { FolderPlus, Trash2 } from 'react-feather'
import styled from 'styled-components'
import { Header, TYPE } from '~/Theme'
import { Panel, ProtocolsTable } from '~/components'
import Row from '~/components/Row'
import { ProtocolsChainsSearch } from '~/components/Search'
import { columnsToShow } from '~/components/Table'
import { Menu } from '~/components/DropdownMenu'
import { useIsClient } from '~/hooks'
import { DEFAULT_PORTFOLIO, useSavedProtocols } from '~/contexts/LocalStorage'

interface IFolder {
  isSaved?: boolean
}

const Action = styled.button<IFolder>`
  svg {
    fill: ${({ theme: { text1 }, isSaved }) => (isSaved ? text1 : 'none')};

    path,
    line {
      stroke: ${({ theme: { text1 } }) => text1};
    }
  }
`

const columns = columnsToShow(
  'protocolName',
  'category',
  'chains',
  '1dChange',
  '7dChange',
  '1mChange',
  'tvl',
  'mcaptvl'
)

function PortfolioContainer({ protocolsDict }) {
  const isClient = useIsClient()

  const { addPortfolio, removePortfolio, savedProtocols, selectedPortfolio, setSelectedPortfolio } = useSavedProtocols()

  const portfolios: string[] = Object.keys(savedProtocols).filter((portfolio) => portfolio !== selectedPortfolio)

  const selectedPortfolioProtocols = savedProtocols[selectedPortfolio]

  const onFolderClick = () => {
    const newPortfolio = window.prompt('New Portfolio')
    if (newPortfolio) {
      addPortfolio(newPortfolio)
    }
  }

  const onTrashClick = () => {
    const deletedPortfolio = window.confirm(`Do you really want to delete "${selectedPortfolio}"?`)
    if (deletedPortfolio) {
      setSelectedPortfolio(DEFAULT_PORTFOLIO)
      removePortfolio(selectedPortfolio)
    }
  }

  const portfolio = Object.values(selectedPortfolioProtocols)

  const filteredProtocols = useMemo(() => {
    if (isClient) {
      return protocolsDict.filter((p) => portfolio.includes(p.name))
    } else return []
  }, [isClient, portfolio, protocolsDict])

  return (
    <>
      <ProtocolsChainsSearch step={{ category: 'Home', name: 'Watchlist' }} />

      <Header>Saved Protocols</Header>

      <Row sx={{ gap: '1rem', margin: '12px 0 -20px' }}>
        <TYPE.main>Current portfolio:</TYPE.main>
        <Menu name={selectedPortfolio} options={portfolios} onItemClick={(value) => setSelectedPortfolio(value)} />
        <Action onClick={onFolderClick}>
          <FolderPlus />
        </Action>
        {selectedPortfolio !== DEFAULT_PORTFOLIO && (
          <Action onClick={onTrashClick}>
            <Trash2 />
          </Action>
        )}
      </Row>

      {filteredProtocols.length ? (
        <ProtocolsTable data={filteredProtocols} columns={columns} />
      ) : (
        <Panel>
          <p style={{ textAlign: 'center' }}>You have not saved any protocols.</p>
        </Panel>
      )}
    </>
  )
}

export default PortfolioContainer
