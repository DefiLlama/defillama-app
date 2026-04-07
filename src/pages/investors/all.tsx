import type { GetServerSideProps, InferGetServerSidePropsType } from 'next'
import { lazy, Suspense } from 'react'
import { SEO } from '~/components/SEO'
import { Toast } from '~/components/Toast'
import { isInvestorsEnabled, INVESTORS_PROJECTS } from '~/containers/Investors/config'
import { Logo } from '~/containers/Investors/Logo'
import { fetchCustomServerData } from '~/containers/Investors/serverDataRegistry'

const InvestorsDashboard = lazy(() => import('~/containers/Investors'))

export const getServerSideProps: GetServerSideProps = async () => {
	if (!isInvestorsEnabled()) {
		return { props: {} }
	}

	let customServerData: Record<string, unknown> = {}
	try {
		const customResults = await Promise.all(
			INVESTORS_PROJECTS.filter((p) => p.dashboardId).map((project) => fetchCustomServerData(project.dashboardId))
		)
		for (const data of customResults) {
			customServerData = { ...customServerData, ...data }
		}
	} catch {}

	return { props: { customServerData } }
}

export default function InvestorsAllPage({
	customServerData
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
	if (!isInvestorsEnabled()) {
		return null
	}

	return (
		<>
			<SEO title="DefiLlama" description="Verified metrics powered by DefiLlama" canonicalUrl={null} />
			<link rel="preload" href="/assets/defillama.webp" as="image" />
			<link rel="preload" href="/assets/defillama-dark.webp" as="image" />
			<Suspense
				fallback={
					<div className="investors-dashboard col-span-full flex min-h-screen flex-col pro-dashboard bg-(--app-bg) md:flex-row">
						<aside className="sl-sidebar fixed top-0 left-0 hidden h-screen w-56 md:block" />
						<div className="flex flex-1 items-center justify-center p-5 md:ml-56">
							<Logo animate />
						</div>
					</div>
				}
			>
				<InvestorsDashboard customServerData={customServerData} />
			</Suspense>
			<Toast />
		</>
	)
}
