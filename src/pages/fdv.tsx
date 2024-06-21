import * as React from 'react'
import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { withPerformanceLogging } from '~/utils/perf'
import dynamic from 'next/dynamic'
import { IBarChartProps } from '~/components/ECharts/types'

const BarChart = dynamic(() => import('~/components/ECharts/BarChart/NonTimeSeries'), {
	ssr: false
}) as React.FC<IBarChartProps>

export const getStaticProps = withPerformanceLogging('fdv', async () => {
	const data = await fetch('https://fdv-server.llama.fi/fdvChanges').then((res) => res.json())

	return {
		props: { data: data.map((item) => [item.categoryName, item.fdvPctChange1D]) },
		revalidate: maxAgeForNext([22])
	}
})

export default function Forks(props) {
	console.log(props.data)
	return (
		<Layout title={`Forks - DefiLlama`} defaultSEO>
			<BarChart title="FDV Changes" chartData={props.data} />
		</Layout>
	)
}
