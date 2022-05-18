import { FullWrapper, PageWrapper } from 'components'
import { GeneralLayout } from '../../layout'
import { getYieldPageData, revalidate } from '../../utils/dataApi'
import { toK } from 'utils'
import Table, { Index, NameYield } from 'components/Table'
import PageHeader from 'components/PageHeader'

export async function getStaticProps() {
    const data = await getYieldPageData()

  const projects = {}
  data.props.pools.forEach((p) => {
    const proj = p.project
    if (projects[proj] === undefined) {
      projects[proj] = { protocols: 0, tvl: 0, name: p.projectName }
    }
    projects[proj].protocols++
    projects[proj].tvl += p.tvlUsd
  })

  const projArray = Object.entries(projects).map(([slug, details]) => ({
    slug,
    ...details,
  }))

  return {
    props: {
      projects: projArray.sort((a, b) => b.tvl - a.tvl),
    },
    revalidate: revalidate(),
  }
}

const columns = [
  {
    header: 'Project',
    accessor: 'name',
    disableSortBy: true,
    Cell: ({ value, rowIndex, rowValues }) => {
      return (
        <Index>
          <span>{rowIndex + 1}</span>
          <NameYield value={{project:value, projectslug:rowValues.slug}} />
        </Index>
      )
    },
  },
  {
    header: 'Pools',
    accessor: 'protocols',
  },
  {
    header: 'Combined TVL',
    accessor: 'tvl',
    Cell: ({ value }) => {
      return <span>{'$' + toK(value)}</span>
    },
  },
]

export default function Protocols({ projects }) {
  return (
    <GeneralLayout title={`Projects - DefiLlama Yield`} defaultSEO>
      <PageWrapper>
        <FullWrapper>
          <PageHeader title="Projects" />
          <Table data={projects} columns={columns} gap="40px" />
        </FullWrapper>
      </PageWrapper>
    </GeneralLayout>
  )
}
