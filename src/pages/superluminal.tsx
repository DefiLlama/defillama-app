import { lazy, Suspense } from 'react'
import { SEO } from '~/components/SEO'
import { Toast } from '~/components/Toast'
import { ProDashboardAPIProvider } from '~/containers/ProDashboard/ProDashboardAPIContext'
import { getSuperLuminalConfig } from '~/containers/SuperLuminal/config'

const SuperLuminalDashboard = lazy(() => import('~/containers/SuperLuminal'))

export default function SuperLuminalPage() {
	const config = getSuperLuminalConfig()

	if (!config) {
		return null
	}

	return (
		<>
			<SEO title={config.branding.name || 'Dashboard'} description="Verified metrics dashboard powered by DefiLlama" />
			<ProDashboardAPIProvider initialDashboardId={config.dashboardId}>
				<Suspense
					fallback={
						<div className="superluminal-dashboard fixed inset-0 z-50 flex items-center justify-center bg-(--app-bg)">
							<div className="sl-loader text-center leading-none select-none">
								<span className="block text-[13px] font-medium tracking-[0.4em] text-(--sl-text-brand)">SUPER</span>
								<span
									className="block text-[34px] font-black tracking-[0.08em] text-transparent"
									style={{ WebkitTextStroke: '1px var(--sl-stroke-brand)' }}
								>
									LUMINAL
								</span>
							</div>
						</div>
					}
				>
					<SuperLuminalDashboard />
				</Suspense>
			</ProDashboardAPIProvider>
			<Toast />
		</>
	)
}
