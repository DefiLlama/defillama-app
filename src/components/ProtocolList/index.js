import { useMemo } from 'react'
import { Header } from 'Theme'
import { ProtocolsChainsSearch } from 'components/Search'
import Table, { columnsToShow } from 'components/Table'
import { RowLinks, LinksWrapper } from 'components/Filters'
import { useCalcStakePool2Tvl } from 'hooks/data'

function AllTokensPage({
  title,
  category,
  selectedChain = 'All',
  chains = [],
  filteredProtocols,
  showChainList = true,
  defaultSortingColumn,
}) {
  const handleRouting = (chain) => {
    if (chain === 'All') return `/protocols/${category?.toLowerCase()}`
    return `/protocols/${category?.toLowerCase()}/${chain}`
  }
  const chainOptions = ['All', ...chains].map((label) => ({ label, to: handleRouting(label) }))

  const protocols = useMemo(() => {
    if (category === 'Lending') {
      return filteredProtocols.map((p) => {
        const bTvl = p.extraTvl?.borrowed?.tvl ?? null
        const msizetvl = bTvl ? (bTvl + p.tvl) / p.tvl : null
        return { ...p, msizetvl }
      })
    } else return filteredProtocols
  }, [filteredProtocols, category])

  const protocolTotals = useCalcStakePool2Tvl(protocols, defaultSortingColumn)

  if (!title) {
    title = `TVL Rankings`
    if (category) {
      title = `${category} TVL Rankings`
    }
  }

  const columns = useMemo(() => {
    if (category === 'Lending') {
      return columnsToShow(
        'protocolName',
        'category',
        'chains',
        '1dChange',
        '7dChange',
        '1mChange',
        'tvl',
        'mcaptvl',
        'msizetvl'
      )
    } else
      return columnsToShow('protocolName', 'category', 'chains', '1dChange', '7dChange', '1mChange', 'tvl', 'mcaptvl')
  }, [category])

  const routeName = category ? (selectedChain === 'All' ? 'All Chains' : selectedChain) : 'All Protocols'

  return (
    <>
      <ProtocolsChainsSearch
        step={{
          category: category || 'Home',
          name: routeName,
          route: 'categories',
        }}
      />
      <Header>{title}</Header>

      {showChainList && (
        <LinksWrapper>
          <RowLinks links={chainOptions} activeLink={selectedChain} />
        </LinksWrapper>
      )}

      <Table data={protocolTotals} columns={columns} />
    </>
  )
}

export default AllTokensPage
