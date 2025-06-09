import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { withPerformanceLogging } from '~/utils/perf'
import ProDashboard from '~/containers/ProDashboard'
import { ProDashboardAPIProvider } from '~/containers/ProDashboard/ProDashboardAPIContext'
import { SubscribePlusCard } from '~/components/SubscribeCards/SubscribePlusCard'
import { useSubscribe } from '~/hooks/useSubscribe'
import { useAuthContext } from '~/containers/Subscribtion/auth'
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
	const router = useRouter()
	const { subscription, isLoading: isSubLoading } = useSubscribe()
	const { isAuthenticated } = useAuthContext()
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

	const initialId = dashboardId === 'new' ? undefined : dashboardId

	return (
		<Layout title="DefiLlama - Pro Dashboard">
			<ProDashboardAPIProvider initialDashboardId={initialId}>
				<ProDashboard />
			</ProDashboardAPIProvider>
		</Layout>
	)
}
