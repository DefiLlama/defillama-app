import * as Ariakit from '@ariakit/react'
import { useRouter } from 'next/router'
import { LoadingDots } from '~/components/Loaders'
import { AgenticChat } from '~/containers/LlamaAI'
import { useAuthContext } from '~/containers/Subscription/auth'
import { SignInModal } from '~/containers/Subscription/SignInModal'
import { useIsClient } from '~/hooks/useIsClient'
import Layout from '~/layout'

const AI_LAYOUT_SEO = {
	title: 'AI Crypto Analysis - DeFi & TradFi Data - LlamaAI',
	description:
		'Get AI-powered answers about chains, protocols, metrics like TVL, fees, revenue, and compare them based on your prompts',
	canonicalUrl: null,
	noIndex: true
} as const

export default function SessionPage() {
	const router = useRouter()
	const { sessionId } = router.query
	const resolvedSessionId = typeof sessionId === 'string' ? sessionId : null
	const isClient = useIsClient()
	const { user, loaders } = useAuthContext()
	const signInDialogStore = Ariakit.useDialogStore()

	if (!isClient || loaders.userLoading || !router.isReady || !resolvedSessionId) {
		return (
			<Layout {...AI_LAYOUT_SEO}>
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
			<Layout {...AI_LAYOUT_SEO}>
				<div className="isolate flex flex-1 flex-col items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-1">
					<p className="flex items-center gap-1 text-center">
						Please{' '}
						<button onClick={signInDialogStore.show} className="underline">
							sign in
						</button>{' '}
						to access this page.
					</p>
				</div>
				<SignInModal store={signInDialogStore} hideWhenAuthenticated={false} />
			</Layout>
		)
	}

	return (
		<Layout {...AI_LAYOUT_SEO} hideDesktopSearchLlamaAiButton>
			<AgenticChat initialSessionId={resolvedSessionId} key={`session-${resolvedSessionId}`} />
		</Layout>
	)
}
