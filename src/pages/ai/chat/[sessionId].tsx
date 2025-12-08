import { useRouter } from 'next/router'
import { BasicLink } from '~/components/Link'
import { LoadingDots } from '~/components/Loaders'
import { LlamaAI } from '~/containers/LlamaAI'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import Layout from '~/layout'

export default function SessionPage() {
	const router = useRouter()
	const { sessionId } = router.query
	const { user, loaders, hasActiveSubscription } = useAuthContext()

	if (loaders.userLoading) {
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

	return (
		<LlamaAI
			initialSessionId={sessionId as string}
			showDebug={user?.flags?.['is_llama'] ?? false}
			key={`llamai-session-page-${sessionId}`}
		/>
	)
}
