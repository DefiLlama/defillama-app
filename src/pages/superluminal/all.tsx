import type { GetServerSideProps, InferGetServerSidePropsType } from 'next'
import { lazy, Suspense } from 'react'
import { SEO } from '~/components/SEO'
import { Toast } from '~/components/Toast'
import { isSuperLuminalEnabled, SUPERLUMINAL_PROJECTS } from '~/containers/SuperLuminal/config'
import { Logo } from '~/containers/SuperLuminal/Logo'
import { fetchCustomServerData } from '~/containers/SuperLuminal/serverDataRegistry'

const SuperLuminalDashboard = lazy(() => import('~/containers/SuperLuminal'))

export const getServerSideProps: GetServerSideProps = async () => {
	if (!isSuperLuminalEnabled()) {
		return { props: {} }
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

	return { props: { customServerData } }
}

export default function SuperLuminalAllPage({
	customServerData
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
	if (!isSuperLuminalEnabled()) {
		return null
	}

	return (
		<>
			<SEO title="Dashboard" description="Verified metrics dashboard powered by DefiLlama" canonicalUrl={null} />
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
				<SuperLuminalDashboard customServerData={customServerData} />
			</Suspense>
			<Toast />
		</>
	)
}
