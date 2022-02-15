import { FullWrapper, PageWrapper } from 'components'
import { CustomLink } from 'components/Link'
import { GeneralLayout } from '../layout'
import { getProtocolsRaw, revalidate } from '../utils/dataApi'
import { toK } from 'utils'
import Table, { Index } from 'components/Table'
import { useMemo } from 'react'

export async function getStaticProps() {
  const protocols = await getProtocolsRaw()

  let categories = {}
  protocols.protocols.forEach((p) => {
    const cat = p.category
    if (categories[cat] === undefined) {
      categories[cat] = { protocols: 0, tvl: 0 }
    }
    categories[cat].protocols++
    categories[cat].tvl += p.tvl
  })

  categories = Object.entries(categories).map(([name, details]) => ({
    name,
    ...details,
    description: descriptions[name] || '',
  }))

  return {
    props: {
      categories: categories.sort((a, b) => b.tvl - a.tvl),
    },
    revalidate: revalidate(),
  }
}

const descriptions = {
  Dexes: 'Protocols where you can swap/trade cryptocurrency',
  Yield: 'Protocols that pay you a reward for your staking/LP on their platform',
  Lending: 'Protocols that allow users to borrow and lend assets',
  'Cross Chain': 'Protocols that add interoperability between different blockchains',
  Staking: 'Rewards/Liquidity for staked assets (cryptocurrency)',
  Services: 'Protocols that provide a service to the user',
  'Yield Aggregator': 'Protocols that aggregated yield from diverse protocols',
  Minting: 'NFT Related (in work)',
  Assets: '(will be removed)',
  Derivatives: 'Smart contracts that gets its value, risk, and basic term structure from an underlying asset',
  Payments: 'Offer the ability to pay/send/receive cryptocurrency',
  Privacy: 'Protocols that have the intention of hiding information about transactions',
  Insurance: 'Protocols that are designed to provide monetary protections',
  Indexes: 'Protocols that have a way to track/created the performance of a group of related assets',
  Synthetics: 'Protocol that created a tokenized derivative that mimics the value of another asset.',
  CDP: 'Protocols that mint its own stablecoin using some collateral',
  Bridge: 'Protocols that bridge token from one network to another',
  'Reserve Currency':
    'Ohm fork: A protocol that uses a reserve of valuable assets acquired through bonding and staking to issue and back its native token',
  Options: 'Protocols that give you the right to buy an asset at a fixed price',
  Launchpad: 'Protocols that launch new projects and coins',
  Gaming: 'Protocols that have gaming components',
  'Prediction Market': 'Protocols that allow you to wager/bet/buy in future results',
  'Algo-Stables': 'From algorithmic coins to stablecoins',
}

const columns = [
  {
    Header: 'Category',
    accessor: 'name',
    Cell: ({ value, row, flatRows }) => {
      const index = flatRows.indexOf(row)
      return (
        <Index>
          <span>{index + 1}</span>
          <CustomLink href={`/protocols/${value}`}>{value}</CustomLink>
        </Index>
      )
    },
  },
  {
    Header: 'Protocols',
    accessor: 'protocols',
  },
  {
    Header: 'Combined TVL',
    accessor: 'tvl',
    Cell: ({ value }) => {
      return <span>{'$' + toK(value)}</span>
    },
  },
  {
    Header: 'Description',
    accessor: 'description',
    disableSortBy: true,
  },
]

export default function Protocols({ categories }) {
  return (
    <GeneralLayout title={`Categories - DefiLlama`} defaultSEO>
      <PageWrapper>
        <FullWrapper>
          <Table data={categories} columns={columns} align="start" gap="40px" />
        </FullWrapper>
      </PageWrapper>
    </GeneralLayout>
  )
}
