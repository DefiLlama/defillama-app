import type { GetServerSideProps, InferGetServerSidePropsType } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { BasicLink } from '~/components/Link'
import { ProDashboardLoader } from '~/containers/ProDashboard/components/ProDashboardLoader'
import { ProDashboardAPIProvider, useProDashboardDashboard } from '~/containers/ProDashboard/ProDashboardAPIContext'
import { fetchDashboardConfig } from '~/containers/ProDashboard/queries.server'
import { getAuthTokenFromRequest } from '~/containers/ProDashboard/server/auth'
import { useAuthContext } from '~/containers/Subscription/auth'
import Layout from '~/layout'
import { withServerSidePropsTelemetry } from '~/utils/telemetry'

const ProDashboard = lazy(() => import('~/containers/ProDashboard'))

const getServerSidePropsHandler: GetServerSideProps = async (context) => {
	const dashboardId = context.params?.dashboardId as string

	context.res.setHeader('Cache-Control', 'private, no-store')

	const authToken = getAuthTokenFromRequest(context.req)
	if (!authToken) {
		return {
			redirect: { destination: `/pro/${dashboardId}`, permanent: false }
		}
	}

	try {
		const dashboard = await fetchDashboardConfig(dashboardId, authToken)
		if (!dashboard) {
			return { notFound: true }
		}
	} catch {
		// Fall through; client will surface error
	}

	return { props: { dashboardId } }
}

export default function DashboardEditPage({ dashboardId }: InferGetServerSidePropsType<typeof getServerSideProps>) {
	return (
		<Layout
			title="DefiLlama Pro - Edit Dashboard"
			description="Edit your custom DeFi analytics dashboard on DefiLlama Pro."
			canonicalUrl={`/pro/${dashboardId}/edit`}
		>
			<ProDashboardAPIProvider
				initialDashboardId={dashboardId}
				mode="edit"
				key={`dashboard-edit-provider-${dashboardId}`}
			>
				<DashboardEditPageContent dashboardId={dashboardId} />
			</ProDashboardAPIProvider>
		</Layout>
	)
}

function DashboardEditPageContent({ dashboardId }: { dashboardId: string }) {
	const router = useRouter()
	const { isAuthenticated, loaders, user } = useAuthContext()
	const { isLoadingDashboard, streamHasResolved, loadError, currentDashboard, dashboardName } =
		useProDashboardDashboard()
	const [isValidating, setIsValidating] = useState(true)
	const hasRedirectedRef = useRef(false)

	useEffect(() => {
		if (!isLoadingDashboard && (currentDashboard || streamHasResolved)) {
			queueMicrotask(() => setIsValidating(false))
		}
	}, [isLoadingDashboard, currentDashboard, streamHasResolved])

	useEffect(() => {
		if (loaders.userLoading) return
		if (!isAuthenticated && !hasRedirectedRef.current) {
			hasRedirectedRef.current = true
			void router.replace(`/pro/${dashboardId}`)
			return
		}
		if (currentDashboard && user?.id && currentDashboard.user !== user.id && !hasRedirectedRef.current) {
			hasRedirectedRef.current = true
			void router.replace(`/pro/${dashboardId}`)
		}
	}, [isAuthenticated, loaders.userLoading, currentDashboard, user?.id, dashboardId, router])

	const isLoading = loaders.userLoading || isValidating || isLoadingDashboard

	if (isLoading) {
		return <ProDashboardLoader />
	}

	if (!currentDashboard && loadError?.status === 401) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1">
				<h1 className="text-3xl font-bold">Sign In Required</h1>
				<p className="text-center text-base text-(--text-label)">Please sign in to edit this dashboard</p>
				<BasicLink
					href={`/subscription?returnUrl=${encodeURIComponent(router.asPath)}`}
					className="mt-7 rounded-md pro-btn-purple px-6 py-3 font-medium"
				>
					Sign In
				</BasicLink>
			</div>
		)
	}

	if (!currentDashboard && loadError && loadError.status >= 500) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1">
				<h1 className="text-3xl font-bold">Failed to load dashboard</h1>
				<BasicLink href={`/pro/${dashboardId}`} className="mt-2 rounded-md pro-btn-purple px-6 py-3 font-medium">
					Back to dashboard
				</BasicLink>
			</div>
		)
	}

	if (!currentDashboard) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1">
				<h1 className="text-3xl font-bold">Dashboard Not Found</h1>
				<BasicLink href="/pro" className="mt-7 rounded-md pro-btn-purple px-6 py-3 font-medium">
					Browse Dashboards
				</BasicLink>
			</div>
		)
	}

	return (
		<>
			<Head>
				<title>{`Edit ${dashboardName} - DefiLlama`}</title>
			</Head>
			<Suspense
				fallback={
					<div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1" />
				}
			>
				<ProDashboard />
			</Suspense>
		</>
	)
}

export const getServerSideProps = withServerSidePropsTelemetry('/pro/[dashboardId]/edit', getServerSidePropsHandler)
