import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { withPerformanceLogging } from '~/utils/perf'
import { DashboardList } from '~/containers/ProDashboard/components/DashboardList'
import { DemoPreview } from '~/containers/ProDashboard/components/DemoPreview'
import { ProDashboardAPIProvider } from '~/containers/ProDashboard/ProDashboardAPIContext'
import { WalletProvider } from '~/layout/WalletProvider'
import { useSubscribe } from '~/hooks/useSubscribe'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { dashboardAPI, Dashboard } from '~/containers/ProDashboard/services/DashboardAPI'
import { LoadingSpinner } from '~/containers/ProDashboard/components/LoadingSpinner'

export const getStaticProps = withPerformanceLogging('index/pro', async () => {
	return {
		props: {},
		revalidate: maxAgeForNext([22])
	}
})

export default function HomePage() {
	const router = useRouter()
	const [dashboards, setDashboards] = useState<Dashboard[]>([])
	const [isLoadingDashboards, setIsLoadingDashboards] = useState(false)
	const { subscription, isLoading: isSubLoading } = useSubscribe()
	const { authorizedFetch, isAuthenticated } = useAuthContext()

	useEffect(() => {
		if (subscription?.status === 'active' && isAuthenticated && authorizedFetch) {
			loadDashboards()
		}
	}, [subscription?.status, isAuthenticated, authorizedFetch])

	const loadDashboards = async () => {
		if (!authorizedFetch) return

		setIsLoadingDashboards(true)
		try {
			const data = await dashboardAPI.listDashboards(authorizedFetch)
			setDashboards(data || [])
		} catch (error) {
			console.error('Failed to load dashboards:', error)
			setDashboards([])
		} finally {
			setIsLoadingDashboards(false)
		}
	}

	const handleSelectDashboard = (dashboardId: string) => {
		router.push(`/pro/${dashboardId}`)
	}

	const handleCreateNew = () => {
		router.push('/pro/new')
	}

	const handleDeleteDashboard = async (dashboardId: string) => {
		if (!authorizedFetch) return

		try {
			await dashboardAPI.deleteDashboard(dashboardId, authorizedFetch)
			setDashboards((prev) => prev.filter((d) => d.id !== dashboardId))
		} catch (error) {
			console.error('Failed to delete dashboard:', error)
		}
	}

	if (isSubLoading) {
		return (
			<Layout title="DefiLlama - Pro Dashboard">
				<div className="flex justify-center items-center h-[40vh]">
					<LoadingSpinner />
				</div>
			</Layout>
		)
	}

	// Show demo preview to both non-authenticated users and non-subscribers
	if (!isAuthenticated || subscription?.status !== 'active') {
		return (
			<Layout title="DefiLlama - Pro Dashboard">
				<DemoPreview />
			</Layout>
		)
	}

	return (
		<Layout title="DefiLlama - Pro Dashboard">
			<DashboardList
				dashboards={dashboards}
				isLoading={isLoadingDashboards}
				onSelectDashboard={handleSelectDashboard}
				onCreateNew={handleCreateNew}
				onDeleteDashboard={isAuthenticated ? handleDeleteDashboard : undefined}
			/>
		</Layout>
	)
}
