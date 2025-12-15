import { lazy, Suspense, useState } from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { maxAgeForNext } from '~/api'
import { BasicLink } from '~/components/Link'
import { LoadingDots } from '~/components/Loaders'
import { LlamaAI } from '~/containers/LlamaAI'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useIsClient } from '~/hooks/useIsClient'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const SubscribeProModal = lazy(() =>
	import('~/components/SubscribeCards/SubscribeProCard').then((m) => ({ default: m.SubscribeProModal }))
)

export const getStaticProps = withPerformanceLogging('LlamaAi', async () => {
	return {
		props: {},
		revalidate: maxAgeForNext([22])
	}
})

export default function LlamaAIPage() {
	const [shouldRenderModal, setShouldRenderModal] = useState(false)
	const router = useRouter()
	const isClient = useIsClient()
	const { user, loaders, hasActiveSubscription } = useAuthContext()
	const subscribeModalStore = Ariakit.useDialogStore()

	if (!isClient || loaders.userLoading) {
		return (
			<Layout
				title="LlamaAI - DefiLlama"
				description="Get AI-powered answers about chains, protocols, metrics like TVL, fees, revenue, and compare them based on your prompts"
			>
				<div className="isolate flex flex-1 flex-col items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-1">
					<p className="flex items-center gap-1 text-center">
						Loading
						<LoadingDots />
					</p>
				</div>
			</Layout>
		)
	}

	if (!user) {
		return (
			<Layout
				title="LlamaAI - DefiLlama"
				description="Get AI-powered answers about chains, protocols, metrics like TVL, fees, revenue, and compare them based on your prompts"
			>
				<div className="isolate flex flex-1 flex-col items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-1">
					<p className="flex items-center gap-1 text-center">
						Please{' '}
						<button
							onClick={() => {
								if (!shouldRenderModal) setShouldRenderModal(true)
								subscribeModalStore.show()
							}}
							className="underline"
						>
							sign in
						</button>{' '}
						to access this page.
					</p>
				</div>
				{shouldRenderModal && (
					<Suspense fallback={<></>}>
						<SubscribeProModal dialogStore={subscribeModalStore} />
					</Suspense>
				)}
			</Layout>
		)
	}

	if (!hasActiveSubscription) {
		return (
			<Layout
				title="LlamaAI - DefiLlama"
				description="Get AI-powered answers about chains, protocols, metrics like TVL, fees, revenue, and compare them based on your prompts"
			>
				<div className="isolate flex flex-1 flex-col items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-1">
					<p className="flex items-center gap-1 text-center">
						Please{' '}
						<BasicLink href={`/subscription?returnUrl=${encodeURIComponent(router.asPath)}`} className="underline">
							subscribe
						</BasicLink>{' '}
						to access this page.
					</p>
				</div>
			</Layout>
		)
	}

	return <LlamaAI showDebug={user?.flags?.['is_llama'] ?? false} />
}
