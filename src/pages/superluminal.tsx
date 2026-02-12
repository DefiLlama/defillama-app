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
						<div className="sl-loader flex flex-col items-center gap-2.5">
							<img src="/assets/defillama.webp" height={36} width={140} className="hidden object-contain dark:block" alt="DefiLlama" />
							<img src="/assets/defillama-dark.webp" height={36} width={140} className="object-contain dark:hidden" alt="DefiLlama" />
							<span className="rounded-full border border-(--sl-accent)/40 px-3 py-1 text-[9px] font-semibold tracking-[0.15em] uppercase text-(--sl-accent)/60 select-none">
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
