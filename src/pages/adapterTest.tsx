import * as React from 'react'
import dynamic from 'next/dynamic'
import Layout from '~/layout'
import { ChartsWrapper, LazyChart } from '~/layout/ProtocolAndPool'
import type { IBarChartProps } from '~/components/ECharts/types'
import Announcement from '~/components/Announcement'
import { useRouter } from 'next/router'

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

export default function Protocols(props) {
	const router = useRouter()
	const chartData = JSON.parse(atob((router.query?.data as string) ?? 'W10='))
	return (
		<Layout title={`Tests`} defaultSEO>
			<Announcement>This page is just used for tests, don't trust anything on this page</Announcement>
			<ChartsWrapper>
				<LazyChart>
					<BarChart chartData={chartData} title="Data" />
				</LazyChart>
			</ChartsWrapper>
		</Layout>
	)
}
