import { useMemo } from 'react'
import { ChevronDown, FolderPlus, Trash2 } from 'react-feather'
import styled from 'styled-components'
import { Panel } from 'components'
import Row, { RowBetween } from 'components/Row'
import Search from 'components/Search'
import { useIsClient } from 'hooks'
import { DEFAULT_PORTFOLIO, useSavedProtocols } from 'contexts/LocalStorage'
import { TYPE } from 'Theme'
import { DropdownMenu, DropdownMenuContent, DefaultMenuButton, DefaultMenuItem } from 'components/DropdownMenu'
import { columns, TableWrapper } from 'components/YieldsPage'

interface IFolder {
  isSaved?: boolean
}

const StyledFolderPlus = styled(FolderPlus)<IFolder>`
  cursor: pointer;
  fill: ${({ theme: { text1 }, isSaved }) => (isSaved ? text1 : 'none')};

  path,
  line {
    stroke: ${({ theme: { text1 } }) => text1};
  }
`

const StyledTrash = styled(Trash2)<IFolder>`
  cursor: pointer;
  fill: ${({ theme: { text1 }, isSaved }) => (isSaved ? text1 : 'none')};

  path,
  line {
    stroke: ${({ theme: { text1 } }) => text1};
  }
`

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
      return protocolsDict.filter((p) => portfolio.includes(p.pool))
    } else return []
  }, [isClient, portfolio, protocolsDict])

  return (
    <>
      <RowBetween>
        <TYPE.largeHeader>Saved Pools</TYPE.largeHeader>
        <Search />
      </RowBetween>

      <Row sx={{ gap: '1rem', margin: '12px 0 -20px' }}>
        <TYPE.main>Current portfolio:</TYPE.main>
        <DropdownMenu>
          <DefaultMenuButton>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedPortfolio}</span>
            <ChevronDown size={16} style={{ flexShrink: '0' }} />
          </DefaultMenuButton>
          <DropdownMenuContent sideOffset={5}>
            {portfolios.map((o) => (
              <DefaultMenuItem key={o} onSelect={() => setSelectedPortfolio(o)}>
                {o}
              </DefaultMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <StyledFolderPlus onClick={onFolderClick} />
        {selectedPortfolio !== DEFAULT_PORTFOLIO && <StyledTrash onClick={onTrashClick} />}
      </Row>

      {filteredProtocols.length ? (
        <TableWrapper
          data={filteredProtocols.map((t) => ({
            id: t.pool,
            pool: t.symbol,
            projectslug: t.project,
            project: t.projectName,
            chains: [t.chain],
            tvl: t.tvlUsd,
            apy: t.apy,
            change1d: t.apyPct1D,
            change7d: t.apyPct7D,
            outlook: t.predictions.predictedClass,
            confidence: t.predictions.binnedConfidence,
          }))}
          columns={columns}
        />
      ) : (
        <Panel>
          <p style={{ textAlign: 'center' }}>You have not saved any pools.</p>
        </Panel>
      )}
    </>
  )
}

export default PortfolioContainer
