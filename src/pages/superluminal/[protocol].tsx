import type { GetServerSideProps, InferGetServerSidePropsType } from 'next'
import { lazy, Suspense } from 'react'
import { SEO } from '~/components/SEO'
import { Toast } from '~/components/Toast'
import { Logo } from '~/containers/SuperLuminal/Logo'
import { isSuperLuminalEnabled, SUPERLUMINAL_PROJECTS, SUPERLUMINAL_PROTOCOL_IDS } from '~/containers/SuperLuminal/config'
import { getProDashboardServerData } from '~/containers/ProDashboard/queries.server'
import { getAuthTokenFromRequest } from '~/containers/ProDashboard/server/auth'

const SuperLuminalDashboard = lazy(() => import('~/containers/SuperLuminal'))

export const getServerSideProps: GetServerSideProps = async (context) => {
	const protocol = context.params?.protocol as string

	if (!isSuperLuminalEnabled() || !protocol || !SUPERLUMINAL_PROTOCOL_IDS.includes(protocol)) {
		return { props: { protocol: protocol || '', serverDataByDashboardId: {} } }
	}

	const project = SUPERLUMINAL_PROJECTS.find((p) => p.id === protocol)
	if (!project?.dashboardId) {
		return { props: { protocol, serverDataByDashboardId: {} } }
	}

	const authToken = getAuthTokenFromRequest(context.req)

	if (authToken) {
		context.res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate')
	} else {
		context.res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
	}

	try {
		const serverData = await getProDashboardServerData({ dashboardId: project.dashboardId, authToken })
		return { props: { protocol, serverDataByDashboardId: { [project.dashboardId]: serverData } } }
	} catch {
		return { props: { protocol, serverDataByDashboardId: {} } }
	}
}

export default function SuperLuminalProtocolPage({
	protocol,
	serverDataByDashboardId
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
	if (!isSuperLuminalEnabled() || !protocol) {
		return null
	}

	if (!SUPERLUMINAL_PROTOCOL_IDS.includes(protocol)) {
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
				<SuperLuminalDashboard protocol={protocol} serverDataByDashboardId={serverDataByDashboardId} />
			</Suspense>
			<Toast />
		</>
	)
}
