import { useState } from 'react'
import { FolderPlus, Trash2 } from 'react-feather'
import styled from 'styled-components'

import { PageWrapper, FullWrapper } from 'components'
import DropdownSelect from 'components/DropdownSelect'
import Panel from 'components/Panel'
import Row, { RowBetween } from 'components/Row'
import Search from 'components/Search'

import { useIsClient } from 'hooks'
import { useSavedProtocols } from 'contexts/LocalStorage'
import { TYPE } from 'Theme'
import Table, { columnsToShow } from 'components/Table'

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

const DEFAULT_PORTFOLIO = 'main'

const columns = columnsToShow('protocolName', 'chains', '1dChange', '7dChange', '1mChange', 'tvl', 'mcaptvl')

function PortfolioContainer({ protocolsDict }) {
  const [selectedPortfolio, setSelectedPortfolio] = useState(DEFAULT_PORTFOLIO)
  const isClient = useIsClient()

  const { addPortfolio, removePortfolio, savedProtocols } = useSavedProtocols()
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

  const filteredProtocols =
    isClient && selectedPortfolioProtocols
      ? Object.keys(selectedPortfolioProtocols)
          .map((protocol) => protocolsDict[protocol])
          .sort((a, b) => b?.tvl - a?.tvl)
      : []

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
          <Table data={filteredProtocols} columns={columns} />
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
