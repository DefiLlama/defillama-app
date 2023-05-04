import Layout from '~/layout'
import { YieldsProjectsTable } from '~/components/Table'
import Announcement from '~/components/Announcement'
import { disclaimer } from '~/components/YieldsPage/utils'
import { maxAgeForNext } from '~/api'
import { getYieldPageData } from '~/api/categories/yield'
import { withPerformanceLogging } from '~/utils/perf'

import PageHeader from '~/components/PageHeader'

function median(numbers) {
	const sorted: any = Array.from(numbers).sort((a: number, b: number) => a - b)
	const middle = Math.floor(sorted.length / 2)

	if (sorted.length % 2 === 0) {
		return (sorted[middle - 1] + sorted[middle]) / 2
	}

	return sorted[middle]
}

export const getStaticProps = withPerformanceLogging('yields/projects', async () => {
	let data = await getYieldPageData()
	data.props.pools = data.props.pools.filter((p) => p.apy > 0)

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
		projects[project]['airdrop'] = project === 'fraxlend' ? false : x[0].airdrop
	}

	const projArray = Object.entries(projects).map(([slug, details]: [string, any]) => ({
		slug,
		...details
	}))

	return {
		props: { projects: projArray.sort((a, b) => b.tvl - a.tvl) },
		revalidate: maxAgeForNext([23])
	}
})

export default function Protocols({ projects }) {
	return (
		<Layout title={`Projects - DefiLlama Yield`} defaultSEO>
			<Announcement>{disclaimer}</Announcement>

			<PageHeader title="Projects" />

			<YieldsProjectsTable data={projects} />
		</Layout>
	)
}
