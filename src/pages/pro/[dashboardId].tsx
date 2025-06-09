import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { withPerformanceLogging } from '~/utils/perf'
import ProDashboard from '~/containers/ProDashboard'
import { ProDashboardAPIProvider } from '~/containers/ProDashboard/ProDashboardAPIContext'
import { SubscribePlusCard } from '~/components/SubscribeCards/SubscribePlusCard'
import { useSubscribe } from '~/hooks/useSubscribe'
import { LoadingSpinner } from '~/containers/ProDashboard/components/LoadingSpinner'

export const getStaticPaths = async () => {
	return {
		paths: [],
		fallback: 'blocking'
	}
}

export const getStaticProps = withPerformanceLogging('pro/[dashboardId]', async ({ params }) => {
	const dashboardId = params?.dashboardId as string

	if (!dashboardId) {
		return {
			notFound: true
		}
	}

	return {
		props: {
			dashboardId
		},
		revalidate: maxAgeForNext([22])
	}
})

interface DashboardPageProps {
	dashboardId: string
}

export default function DashboardPage({ dashboardId }: DashboardPageProps) {
	const { subscription, isLoading: isSubLoading } = useSubscribe()
	const [isValidating, setIsValidating] = useState(true)

	useEffect(() => {
		if (dashboardId === 'new') {
			setIsValidating(false)
			return
		}

		setIsValidating(false)
	}, [dashboardId])

	if (isSubLoading || isValidating) {
		return (
			<Layout title="DefiLlama - Pro Dashboard">
				<div className="flex justify-center items-center h-[40vh]">
					<LoadingSpinner />
				</div>
			</Layout>
		)
	}

	if (subscription?.status !== 'active') {
		return (
			<Layout title="DefiLlama - Pro Dashboard">
				<div className="flex flex-col items-center justify-center w-full px-4 py-10">
					<div className="mb-10 text-center w-full max-w-3xl">
						<h2 className="text-3xl font-extrabold text-white mb-3">Unlock the Full Picture</h2>
						<p className="text-[#b4b7bc] text-lg mb-4">
							The Pro Dashboard offers dynamic, customizable charts. Here's a sneak peek of what you can explore with a
							Llama+ subscription:
						</p>
					</div>

					<SubscribePlusCard context="modal" />
				</div>
			</Layout>
		)
	}

	const initialId = dashboardId === 'new' ? undefined : dashboardId
	console.log('Passing to provider:', { dashboardId, initialId })

	return (
		<Layout title="DefiLlama - Pro Dashboard">
			<ProDashboardAPIProvider initialDashboardId={initialId}>
				<ProDashboard />
			</ProDashboardAPIProvider>
		</Layout>
	)
}
