import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { withPerformanceLogging } from '~/utils/perf'
import { DashboardList } from '~/containers/ProDashboard/components/DashboardList'
import { DemoPreview } from '~/containers/ProDashboard/components/DemoPreview'
import { ProDashboardAPIProvider, useProDashboard } from '~/containers/ProDashboard/ProDashboardAPIContext'
import { useSubscribe } from '~/hooks/useSubscribe'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { LoadingSpinner } from '~/containers/ProDashboard/components/LoadingSpinner'

export const getStaticProps = withPerformanceLogging('index/pro', async () => {
	return {
		props: {},
		revalidate: maxAgeForNext([22])
	}
})

function ProPageContent() {
	const router = useRouter()
	const { subscription, isLoading: isSubLoading } = useSubscribe()
	const { isAuthenticated } = useAuthContext()
	const { dashboards, isLoadingDashboards, createNewDashboard, deleteDashboard } = useProDashboard()

	const handleSelectDashboard = (dashboardId: string) => {
		router.push(`/pro/${dashboardId}`)
	}

	const handleDeleteDashboard = async (dashboardId: string) => {
		await deleteDashboard(dashboardId)
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
				onCreateNew={createNewDashboard}
				onDeleteDashboard={isAuthenticated ? handleDeleteDashboard : undefined}
			/>
		</Layout>
	)
}

export default function HomePage() {
	return (
		<ProDashboardAPIProvider>
			<ProPageContent />
		</ProDashboardAPIProvider>
	)
}
