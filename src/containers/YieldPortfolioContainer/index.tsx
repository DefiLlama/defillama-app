import { useMemo } from 'react'
import { FolderPlus, Trash2 } from 'react-feather'
import styled from 'styled-components'
import { Header, TYPE } from '~/Theme'
import { Panel } from '~/components'
import Row from '~/components/Row'
import { Menu } from '~/components/DropdownMenu'
import { columns, TableWrapper } from '~/components/YieldsPage/shared'
import { YieldsSearch } from '~/components/Search'
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
      const list = protocolsDict.filter((p) => portfolio.includes(p.pool))
      return list.map((t) => ({
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
      }))
    } else return []
  }, [isClient, portfolio, protocolsDict])

  return (
    <>
      <YieldsSearch step={{ category: 'Yields', name: 'Watchlist', hideOptions: true }} />

      <Header>Saved Pools</Header>

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
        <TableWrapper data={filteredProtocols} columns={columns} />
      ) : (
        <Panel>
          <p style={{ textAlign: 'center' }}>You have not saved any pools.</p>
        </Panel>
      )}
    </>
  )
}

export default PortfolioContainer
