import { lazy, Suspense } from 'react'
import { SEO } from '~/components/SEO'
import { Toast } from '~/components/Toast'
import { Logo } from '~/containers/SuperLuminal/Logo'
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
					<div className="superluminal-dashboard flex min-h-screen flex-col pro-dashboard bg-(--app-bg) md:flex-row">
						<aside className="sl-sidebar hidden h-screen w-56 shrink-0 md:block" />
						<div className="flex flex-1 items-center justify-center">
							<Logo animate />
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
