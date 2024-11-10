import * as React from 'react'
import dynamic from 'next/dynamic'
import Layout from '~/layout'
import { LazyChart } from '~/components/LazyChart'
import type { IBarChartProps } from '~/components/ECharts/types'
import { Announcement } from '~/components/Announcement'
import { useRouter } from 'next/router'

function decode(str: string) {
	const digit = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_'
	const fromB64 = (x: string) => x.split('').reduce((s, v) => s * 64 + digit.indexOf(v), 0)
	return str.match(/.{1,4}/g)?.map((g) => fromB64(g.replaceAll('=', '')))
}

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

export default function AdapterTest() {
	const router = useRouter()
	const start = Number(router.query?.start)
	const chartData = decode((router.query?.data as string) ?? 'W10=').map((u, i) => [start + i * (24 * 3600), u])
	return (
		<Layout title={`Tests`} defaultSEO>
			<Announcement>This page is just used for tests, don't trust anything on this page</Announcement>
			<div className="grid grid-cols-2 rounded-xl bg-[var(--bg6)] shadow">
				<LazyChart>
					<BarChart chartData={chartData} title="Data" />
				</LazyChart>
			</div>
		</Layout>
	)
}
