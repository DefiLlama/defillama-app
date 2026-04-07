import type { GetServerSideProps, InferGetServerSidePropsType } from 'next'
import { lazy, Suspense } from 'react'
import { SEO } from '~/components/SEO'
import { Toast } from '~/components/Toast'
import {
	isInvestorsEnabled,
	INVESTORS_PROJECTS,
	INVESTORS_PROTOCOL_IDS
} from '~/containers/Investors/config'
import { Logo } from '~/containers/Investors/Logo'
import { fetchCustomServerData } from '~/containers/Investors/serverDataRegistry'

const InvestorsDashboard = lazy(() => import('~/containers/Investors'))

export const getServerSideProps: GetServerSideProps = async (context) => {
	const protocol = context.params?.protocol as string

	if (!isInvestorsEnabled() || !protocol || !INVESTORS_PROTOCOL_IDS.includes(protocol)) {
		return { props: { protocol: protocol || '' } }
	}

	const project = INVESTORS_PROJECTS.find((p) => p.id === protocol)
	if (!project?.dashboardId) {
		return { props: { protocol } }
	}

	try {
		const customServerData = await fetchCustomServerData(project.dashboardId)
		return { props: { protocol, customServerData } }
	} catch {
		return { props: { protocol, customServerData: {} } }
	}
}

export default function InvestorsProtocolPage({
	protocol,
	customServerData
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
	if (!isInvestorsEnabled() || !protocol) {
		return null
	}

	if (!INVESTORS_PROTOCOL_IDS.includes(protocol)) {
		return null
	}

	const project = INVESTORS_PROJECTS.find((p) => p.id === protocol)
	const protocolName = project?.name ?? protocol

	return (
		<>
			<SEO
				title={`DefiLlama x ${protocolName}`}
				description={`Verified metrics for ${protocolName} powered by DefiLlama`}
				canonicalUrl={null}
			/>
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
				<InvestorsDashboard protocol={protocol} customServerData={customServerData} />
			</Suspense>
			<Toast />
		</>
	)
}
