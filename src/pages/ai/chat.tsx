import * as Ariakit from '@ariakit/react'
import { lazy, Suspense, useState } from 'react'
import { LoadingDots } from '~/components/Loaders'
import { AgenticChat } from '~/containers/LlamaAI'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useIsClient } from '~/hooks/useIsClient'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const SubscribeProModal = lazy(() =>
	import('~/components/SubscribeCards/SubscribeProCard').then((m) => ({ default: m.SubscribeProModal }))
)

export const getStaticProps = withPerformanceLogging('LlamaAi', () => {
	return {
		props: {},
		revalidate: maxAgeForNext([22])
	}
})

export default function LlamaAIPage() {
	const [shouldRenderModal, setShouldRenderModal] = useState(false)
	const isClient = useIsClient()
	const { user, loaders } = useAuthContext()
	const subscribeModalStore = Ariakit.useDialogStore()

	if (!isClient || loaders.userLoading) {
		return (
			<Layout
				title="AI Crypto Analysis - DeFi & TradFi Data - LlamaAI"
				description="Get AI-powered answers about chains, protocols, metrics like TVL, fees, revenue, and compare them based on your prompts"
				canonicalUrl={null}
				noIndex={true}
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
				title="AI Crypto Analysis - DeFi & TradFi Data - LlamaAI"
				description="Get AI-powered answers about chains, protocols, metrics like TVL, fees, revenue, and compare them based on your prompts"
				canonicalUrl={null}
				noIndex={true}
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
				{shouldRenderModal ? (
					<Suspense fallback={<></>}>
						<SubscribeProModal dialogStore={subscribeModalStore} />
					</Suspense>
				) : null}
			</Layout>
		)
	}

	return (
		<Layout
			title="AI Crypto Analysis - DeFi & TradFi Data - LlamaAI"
			description="Get AI-powered answers about chains, protocols, metrics like TVL, fees, revenue, and compare them based on your prompts"
			canonicalUrl={null}
			noIndex={true}
		>
			<AgenticChat />
		</Layout>
	)
}
