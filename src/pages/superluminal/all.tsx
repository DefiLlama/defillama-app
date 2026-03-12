import type { GetServerSideProps, InferGetServerSidePropsType } from 'next'
import { lazy, Suspense } from 'react'
import { SEO } from '~/components/SEO'
import { Toast } from '~/components/Toast'
import { getProDashboardServerData } from '~/containers/ProDashboard/queries.server'
import { getAuthTokenFromRequest } from '~/containers/ProDashboard/server/auth'
import { isSuperLuminalEnabled, SUPERLUMINAL_PROJECTS } from '~/containers/SuperLuminal/config'
import { Logo } from '~/containers/SuperLuminal/Logo'
import { fetchCustomServerData } from '~/containers/SuperLuminal/serverDataRegistry'

const SuperLuminalDashboard = lazy(() => import('~/containers/SuperLuminal'))

export const getServerSideProps: GetServerSideProps = async (context) => {
	if (!isSuperLuminalEnabled()) {
		return { props: { serverDataByDashboardId: {} } }
	}

	const authToken = getAuthTokenFromRequest(context.req)

	if (authToken) {
		context.res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate')
	} else {
		context.res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
	}

	const serverDataByDashboardId: Record<string, any> = {}

	const results = await Promise.allSettled(
		SUPERLUMINAL_PROJECTS.filter((p) => p.dashboardId && !p.customOnly).map(async (project) => ({
			dashboardId: project.dashboardId,
			data: await getProDashboardServerData({ dashboardId: project.dashboardId, authToken, skipTableData: true })
		}))
	)

	for (const result of results) {
		if (result.status === 'fulfilled') {
			serverDataByDashboardId[result.value.dashboardId] = result.value.data
		}
	}

	let customServerData: Record<string, unknown> = {}
	try {
		const customResults = await Promise.all(
			SUPERLUMINAL_PROJECTS.filter((p) => p.dashboardId).map((project) => fetchCustomServerData(project.dashboardId))
		)
		for (const data of customResults) {
			customServerData = { ...customServerData, ...data }
		}
	} catch {}

	return { props: { serverDataByDashboardId, customServerData } }
}

export default function SuperLuminalAllPage({
	serverDataByDashboardId,
	customServerData
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
	if (!isSuperLuminalEnabled()) {
		return null
	}

	return (
		<>
			<SEO title="Dashboard" description="Verified metrics dashboard powered by DefiLlama" />
			<link rel="preload" href="/assets/defillama.webp" as="image" />
			<link rel="preload" href="/assets/defillama-dark.webp" as="image" />
			<Suspense
				fallback={
					<div className="superluminal-dashboard col-span-full flex min-h-screen flex-col pro-dashboard bg-(--app-bg) md:flex-row">
						<aside className="sl-sidebar fixed top-0 left-0 hidden h-screen w-56 md:block" />
						<div className="flex flex-1 items-center justify-center p-5 md:ml-56">
							<Logo animate />
						</div>
					</div>
				}
			>
				<SuperLuminalDashboard serverDataByDashboardId={serverDataByDashboardId} customServerData={customServerData} />
			</Suspense>
			<Toast />
		</>
	)
}
