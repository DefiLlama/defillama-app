import Layout from '~/layout'
import Table, { Index, NameYield } from '~/components/Table'
import PageHeader from '~/components/PageHeader'
import { YieldsSearch } from '~/components/Search'
import { toK, formattedPercent } from '~/utils'
import { revalidate } from '~/api'
import { getYieldPageData } from '~/api/categories/yield'
import pako from 'pako'

function median(numbers) {
	const sorted: any = Array.from(numbers).sort((a: number, b: number) => a - b)
	const middle = Math.floor(sorted.length / 2)

	if (sorted.length % 2 === 0) {
		return (sorted[middle - 1] + sorted[middle]) / 2
	}

	return sorted[middle]
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
					<NameYield value={value} project={value} projectslug={rowValues.slug} />
				</Index>
			)
		}
	},
	{
		header: 'Category',
		accessor: 'category'
	},
	{
		header: 'Pools',
		accessor: 'protocols'
	},
	{
		header: 'Combined TVL',
		accessor: 'tvl',
		Cell: ({ value }) => {
			return <span>{'$' + toK(value)}</span>
		}
	},
	{
		header: 'Audits',
		accessor: 'audits',
		Cell: ({ value }) => {
			return <span>{value ? 'Yes' : 'No'}</span>
		}
	},
	{
		header: 'Median APY',
		accessor: 'medianApy',
		Cell: ({ value }) => {
			return <span>{formattedPercent(value, true)}</span>
		}
	}
]

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

	// add other fields
	for (const project of Object.keys(projects)) {
		const x = data.props.pools.filter((p) => p.project === project)
		const m = median(x.map((el) => el.apy))
		projects[project]['medianApy'] = m
		projects[project]['audits'] = x[0].audits !== '0'
		projects[project]['category'] = x[0].category
	}

	const projArray = Object.entries(projects).map(([slug, details]: [string, any]) => ({
		slug,
		...details
	}))

	// compress
	const strData = JSON.stringify({
		props: {
			projects: projArray.sort((a, b) => b.tvl - a.tvl)
		}
	})
	const a = pako.deflate(strData)
	const compressed = Buffer.from(a).toString('base64')

	return {
		props: { compressed },
		revalidate: revalidate(23)
	}
}

export default function Protocols(compressedProps) {
	const b = new Uint8Array(Buffer.from(compressedProps.compressed, 'base64'))
	const data = JSON.parse(pako.inflate(b, { to: 'string' }))
	return (
		<Layout title={`Projects - DefiLlama Yield`} defaultSEO>
			<YieldsSearch step={{ category: 'Yields', name: 'All projects', hideOptions: true }} />
			<PageHeader title="Projects" />
			<Table data={data.props.projects} columns={columns} gap="40px" />
		</Layout>
	)
}
