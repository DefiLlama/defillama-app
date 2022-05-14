import { useMemo } from 'react'
import { FolderPlus, Trash2 } from 'react-feather'
import styled from 'styled-components'

import { PageWrapper, FullWrapper, ProtocolsTable } from 'components'
import DropdownSelect from 'components/DropdownSelect'
import Panel from 'components/Panel'
import Row, { RowBetween } from 'components/Row'
import Search from 'components/Search'

import { useIsClient } from 'hooks'
import { DEFAULT_PORTFOLIO, useSavedProtocols } from 'contexts/LocalStorage'
import { TYPE } from 'Theme'
import { columnsToShow } from 'components/Table'

const StyledFolderPlus = styled(FolderPlus)`
  cursor: pointer;
  fill: ${({ theme: { text1 }, isSaved }) => (isSaved ? text1 : 'none')};

  path,
  line {
    stroke: ${({ theme: { text1 } }) => text1};
  }
`

const StyledTrash = styled(Trash2)`
  cursor: pointer;
  fill: ${({ theme: { text1 }, isSaved }) => (isSaved ? text1 : 'none')};

  path,
  line {
    stroke: ${({ theme: { text1 } }) => text1};
  }
`

const columns = columnsToShow('protocolName', 'chains', '1dChange', '7dChange', '1mChange', 'tvl', 'mcaptvl')

function PortfolioContainer({ protocolsDict }) {
  const isClient = useIsClient()

  const { addPortfolio, removePortfolio, savedProtocols, selectedPortfolio, setSelectedPortfolio } = useSavedProtocols()
  const portfolios = Object.keys(savedProtocols)
    .filter((portfolio) => portfolio !== selectedPortfolio)
    .map((portfolio) => ({ label: portfolio }))

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
    <PageWrapper>
      <FullWrapper>
        <RowBetween>
          <TYPE.largeHeader>Saved Protocols</TYPE.largeHeader>
          <Search />
        </RowBetween>
        <Row sx={{ gap: '1rem' }}>
          <TYPE.main>Current portfolio:</TYPE.main>
          <DropdownSelect setActive={setSelectedPortfolio} active={selectedPortfolio} options={portfolios} />
          <StyledFolderPlus onClick={onFolderClick} />
          {selectedPortfolio !== DEFAULT_PORTFOLIO && <StyledTrash onClick={onTrashClick} />}
        </Row>

        {filteredProtocols.length ? (
          <ProtocolsTable data={filteredProtocols} columns={columns} />
        ) : (
          <Panel style={{ marginTop: '6px', padding: '1rem 0 0 0 ' }}>
            <TYPE.main sx={{ textAlign: 'center', padding: '1rem' }}>You have not saved any protocols.</TYPE.main>
          </Panel>
        )}
      </FullWrapper>
    </PageWrapper>
  )
}

export default PortfolioContainer
