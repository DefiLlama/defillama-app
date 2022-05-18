import { FullWrapper, PageWrapper } from 'components'
import { CustomLink } from 'components/Link'
import { GeneralLayout } from '../layout'
import { getPeggedAssets, revalidate, getPeggedPrices } from '../utils/dataApi'
import { toK } from 'utils'
import Table, { Index } from 'components/Table'
import PageHeader from 'components/PageHeader'
import { capitalizeFirstLetter } from 'utils'

export async function getStaticProps() {
  const peggedAssets = await getPeggedAssets()
  const priceChart = await getPeggedPrices()
  const currentPrices = priceChart[priceChart.length - 1] ?? null
  let categories = {}
  peggedAssets.peggedAssets.forEach((p) => {
    const pegType = p.pegType
    const price = currentPrices.prices[p.gecko_id]
    const cat = p.category
    if (categories[cat] === undefined) {
      categories[cat] = { peggedAssets: 0, mcap: 0 }
    }
    categories[cat].peggedAssets++
    if (price) {
      categories[cat].mcap += p.circulating[pegType] * price
    } else {
      categories[cat].mcap += p.circulating[pegType]
    }
  })

  categories = Object.entries(categories).map(([name, details]) => ({
    name,
    ...details,
    description: descriptions[name] || '',
  }))

  return {
    props: {
      categories: categories.sort((a, b) => b.mcap - a.mcap),
    },
    revalidate: revalidate(),
  }
}

const descriptions = {
  stablecoins: 'An asset whose price is pegged to another asset (most commonly a currency like the US dollar).',
}

const columns = [
  {
    header: 'Category',
    accessor: 'name',
    disableSortBy: true,
    Cell: ({ value, rowIndex }) => {
      return (
        <Index>
          <span>{rowIndex + 1}</span>
          <CustomLink href={`/peggedassets/${value}`}>{capitalizeFirstLetter(value)}</CustomLink>
        </Index>
      )
    },
  },
  {
    header: 'Pegged Assets',
    accessor: 'peggedAssets',
  },
  {
    header: 'Combined Mcap',
    accessor: 'mcap',
    Cell: ({ value }) => {
      return <span>{'$' + toK(value)}</span>
    },
  },
  {
    header: 'Description',
    accessor: 'description',
    disableSortBy: true,
  },
]

export default function PeggedAssets({ categories }) {
  return (
    <GeneralLayout title={`Categories - DefiLlama`} defaultSEO>
      <PageWrapper>
        <FullWrapper>
          <PageHeader title="Pegged Asset Categories" />
          <Table data={categories} columns={columns} align="start" gap="40px" />
        </FullWrapper>
      </PageWrapper>
    </GeneralLayout>
  )
}
