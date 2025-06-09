import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { withPerformanceLogging } from '~/utils/perf'
import { DashboardList } from '~/containers/ProDashboard/components/DashboardList'
import { SubscribePlusCard } from '~/components/SubscribeCards/SubscribePlusCard'
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
			setDashboards(prev => prev.filter(d => d.id !== dashboardId))
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
