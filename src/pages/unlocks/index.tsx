import { useRouter } from 'next/router'
import * as React from 'react'
import { Suspense } from 'react'
import { maxAgeForNext } from '~/api'
import { getAllProtocolEmissions } from '~/api/categories/protocols'
import { Announcement } from '~/components/Announcement'
import { UpcomingUnlockVolumeChart } from '~/components/Charts/UpcomingUnlockVolumeChart'
import { Metrics } from '~/components/Metrics'
import { PastUnlockPriceImpact } from '~/components/Unlocks/PastUnlockPriceImpact'
import { TopUnlocks } from '~/components/Unlocks/TopUnlocks'
import { UnlocksTable } from '~/containers/Unlocks/Table'
import { useWatchlistManager } from '~/contexts/LocalStorage'
import Layout from '~/layout'
import { formattedNum } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

const calculateUnlockStatistics = (data) => {
	let upcomingUnlocks30dValue = 0
	let upcomingUnlocks7dValue = 0
	const now = Date.now() / 1000
	const thirtyDaysLater = now + 30 * 24 * 60 * 60
	const sevenDaysLater = now + 7 * 24 * 60 * 60

	data?.forEach((protocol) => {
		if (!protocol.upcomingEvent || protocol.tPrice === null || protocol.tPrice === undefined) {
			return
		}

		protocol.upcomingEvent.forEach((event) => {
			if (event.timestamp === null || !event.noOfTokens || event.noOfTokens.length === 0) {
				return
			}

			const totalTokens = event.noOfTokens.reduce((sum, amount) => sum + amount, 0)
			if (totalTokens === 0) {
				return
			}

			const valueUSD = totalTokens * protocol.tPrice
			if (event.timestamp >= now && event.timestamp <= thirtyDaysLater) {
				upcomingUnlocks30dValue += valueUSD
			}
			if (event.timestamp >= now && event.timestamp <= sevenDaysLater) {
				upcomingUnlocks7dValue += valueUSD
			}
		})
	})

	return {
		upcomingUnlocks7dValue,
		upcomingUnlocks30dValue,
		totalProtocols: data?.length || 0
	}
}

export const getStaticProps = withPerformanceLogging('unlocks', async () => {
	const data = await getAllProtocolEmissions({
		endDate: Date.now() / 1000 + 30 * 24 * 60 * 60
	})
	const unlockStats = calculateUnlockStatistics(data)
	return {
		props: {
			data,
			unlockStats
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function Protocols({ data, unlockStats }) {
	const [projectName, setProjectName] = React.useState('')
	const [showOnlyWatchlist, setShowOnlyWatchlist] = React.useState(false)
	const { savedProtocols } = useWatchlistManager('defi')
	const router = useRouter()

	const { minUnlockValue, maxUnlockValue } = router.query
	const min = typeof minUnlockValue === 'string' && minUnlockValue !== '' ? Number(minUnlockValue) : null
	const max = typeof maxUnlockValue === 'string' && maxUnlockValue !== '' ? Number(maxUnlockValue) : null

	const { upcomingUnlocks7dValue, upcomingUnlocks30dValue, totalProtocols } = unlockStats

	return (
		<Layout title={`Unlocks - DefiLlama`} defaultSEO>
			<Announcement notCancellable>
				<span>Are we missing any protocol?</span>
				<a
					href="https://airtable.com/shrD1bSGYNcdFQ6kd"
					className="text-(--blue) underline font-medium"
					target="_blank"
					rel="noopener noreferrer"
				>
					Add it here!
				</a>
			</Announcement>

			<Metrics currentMetric="Unlocks" />

			<div className="grid grid-cols-2 relative isolate xl:grid-cols-3 gap-2">
				<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md flex flex-col gap-6 p-5 col-span-2 w-full xl:col-span-1 overflow-x-auto">
					<h1 className="text-xl font-semibold">Unlock Statistics</h1>
					<p className="flex flex-col">
						<span className="text-[#545757] dark:text-[#cccccc]">Total Protocols Tracked</span>
						<span className="font-semibold text-3xl font-jetbrains">{totalProtocols}</span>
					</p>
					<p className="flex flex-col">
						<span className="text-[#545757] dark:text-[#cccccc]">Upcoming Unlocks (7d)</span>
						<span className="font-semibold text-3xl font-jetbrains">{formattedNum(upcomingUnlocks7dValue, true)}</span>
					</p>
					<p className="flex flex-col">
						<span className="text-[#545757] dark:text-[#cccccc]">Upcoming Unlocks (30d)</span>
						<span className="font-semibold text-3xl font-jetbrains">{formattedNum(upcomingUnlocks30dValue, true)}</span>
					</p>
				</div>
				<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md flex flex-col col-span-2 min-h-[418px]">
					<UpcomingUnlockVolumeChart protocols={data} />
				</div>
			</div>

			<Suspense fallback={<div className="min-h-[400px] md:min-h-[200px] xl:min-h-fit"></div>}>
				<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 isolate">
					<div className="col-span-1 bg-(--cards-bg) border border-(--cards-border) rounded-md p-2 flex flex-col gap-1">
						<TopUnlocks data={data} period={1} title="24h Top Unlocks" className="col-span-1 h-fit" />
					</div>
					<div className="col-span-1 bg-(--cards-bg) border border-(--cards-border) rounded-md p-2 flex flex-col gap-1">
						<TopUnlocks data={data} period={30} title="30d Top Unlocks" className="col-span-1 h-fit" />
					</div>
					<div className="col-span-1 bg-(--cards-bg) border border-(--cards-border) rounded-md p-2 flex flex-col gap-1">
						<PastUnlockPriceImpact data={data} title="Post Unlock Price Impact" className="col-span-1 h-fit" />
					</div>
				</div>
			</Suspense>

			<UnlocksTable
				protocols={data}
				showOnlyWatchlist={showOnlyWatchlist}
				setShowOnlyWatchlist={setShowOnlyWatchlist}
				projectName={projectName}
				setProjectName={setProjectName}
				savedProtocols={savedProtocols}
				minUnlockValue={min}
				maxUnlockValue={max}
			/>
		</Layout>
	)
}
