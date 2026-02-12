import { lazy, Suspense } from 'react'
import { SEO } from '~/components/SEO'
import { Toast } from '~/components/Toast'
import { isSuperLuminalEnabled } from '~/containers/SuperLuminal/config'

const SuperLuminalDashboard = lazy(() => import('~/containers/SuperLuminal'))

export default function SuperLuminalPage() {
	if (!isSuperLuminalEnabled()) {
		return null
	}

	return (
		<>
			<SEO title="Dashboard" description="Verified metrics dashboard powered by DefiLlama" />
			<Suspense
				fallback={
					<div className="superluminal-dashboard fixed inset-0 z-50 flex items-center justify-center bg-(--app-bg)">
						<div className="sl-loader text-center leading-tight select-none">
							<span className="block text-[20px] font-black tracking-[0.12em] text-(--sl-text-brand)">DefiLlama</span>
							<span
								className="block text-[13px] font-bold tracking-[0.2em] uppercase text-transparent"
								style={{ WebkitTextStroke: '1px var(--sl-stroke-brand)' }}
							>
								Investor Relationships
							</span>
						</div>
					</div>
				}
			>
				<SuperLuminalDashboard />
			</Suspense>
			<Toast />
		</>
	)
}
