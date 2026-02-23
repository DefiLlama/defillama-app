import type { GetServerSideProps, InferGetServerSidePropsType } from 'next'
import { lazy, Suspense } from 'react'
import { SEO } from '~/components/SEO'
import { Toast } from '~/components/Toast'
import { Logo } from '~/containers/SuperLuminal/Logo'
import { isSuperLuminalEnabled, SUPERLUMINAL_PROJECTS } from '~/containers/SuperLuminal/config'
import { getProDashboardServerData } from '~/containers/ProDashboard/queries.server'
import { getAuthTokenFromRequest } from '~/containers/ProDashboard/server/auth'

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
		SUPERLUMINAL_PROJECTS.filter((p) => p.dashboardId).map(async (project) => ({
			dashboardId: project.dashboardId,
			data: await getProDashboardServerData({ dashboardId: project.dashboardId, authToken })
		}))
	)

	for (const result of results) {
		if (result.status === 'fulfilled') {
			serverDataByDashboardId[result.value.dashboardId] = result.value.data
		}
	}

	return { props: { serverDataByDashboardId } }
}

export default function SuperLuminalAllPage({
	serverDataByDashboardId
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
				<SuperLuminalDashboard serverDataByDashboardId={serverDataByDashboardId} />
			</Suspense>
			<Toast />
		</>
	)
}
