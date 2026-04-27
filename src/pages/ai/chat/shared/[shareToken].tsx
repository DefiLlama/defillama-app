import * as Ariakit from '@ariakit/react'
import { useQuery } from '@tanstack/react-query'
import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useCallback, useState } from 'react'
import { LoadingDots } from '~/components/Loaders'
import { AI_SERVER } from '~/constants'
import { AgenticChat } from '~/containers/LlamaAI'
import { useAuthContext } from '~/containers/Subscription/auth'
import { SignInModal } from '~/containers/Subscription/SignInModal'
import Layout from '~/layout'
import { fetchJson } from '~/utils/async'
import { withServerSidePropsTelemetry } from '~/utils/telemetry'

interface SharedSession {
	session: {
		sessionId: string
		title: string
		createdAt: string
		isPublic: boolean
	}
	// API now returns role-based format
	messages: Array<{
		role: 'user' | 'assistant'
		content: string
		messageId?: string
		timestamp: number
		sequenceNumber?: number
		images?: Array<{ url: string; mimeType: string; filename?: string }>
		// Assistant-specific fields
		metadata?: any
		suggestions?: any[]
		charts?: any[]
		chartData?: any[] | Record<string, any[]>
		citations?: string[]
		csvExports?: Array<{ id: string; title: string; url: string; rowCount: number; filename: string }>
	}>
	isPublicView: true
}

interface PageProps {
	shareToken: string
	sessionTitle: string | null
}

const getServerSidePropsHandler: GetServerSideProps<PageProps> = async (context) => {
	const shareToken = context.params?.shareToken as string

	let sessionTitle: string | null = null
	try {
		const data = await fetchJson<SharedSession>(`${AI_SERVER}/user/public/${shareToken}`)
		sessionTitle = data?.session?.title || null
	} catch {
		// Session might not exist or be private — page will handle the error state
	}

	return {
		props: { shareToken, sessionTitle }
	}
}

export const getServerSideProps = withServerSidePropsTelemetry<PageProps>(
	'/ai/chat/shared/[shareToken]',
	getServerSidePropsHandler
)

async function getSharedSession(shareToken: string) {
	try {
		if (!shareToken) {
			return null
		}
		return await fetchJson<SharedSession>(`${AI_SERVER}/user/public/${shareToken}`)
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Failed to fetch shared session')
	}
}

export default function SharedConversationPage({ shareToken: ssrToken, sessionTitle }: PageProps) {
	const router = useRouter()
	const shareToken = (router.query.shareToken as string) || ssrToken
	const { user } = useAuthContext()
	const [pendingMessage, setPendingMessage] = useState<string | null>(null)
	const signInDialogStore = Ariakit.useDialogStore()

	const ogImageUrl = `${AI_SERVER}/user/og/${shareToken}`
	const title = sessionTitle || 'AI Crypto Analysis - LlamaAI'
	const description = sessionTitle
		? `${sessionTitle} — AI-powered DeFi analysis by LlamaAI`
		: 'Get AI-powered answers about chains, protocols, metrics like TVL, fees, revenue, and compare them based on your prompts'

	const {
		data: session,
		isLoading,
		error
	} = useQuery({
		queryKey: ['llamaai', 'shared-session', shareToken],
		queryFn: () => getSharedSession(shareToken),
		enabled: !!shareToken && typeof shareToken === 'string',
		staleTime: Infinity,
		refetchOnWindowFocus: false,
		retry: false
	})

	// Unauth user submitting: save message + show login. After login, the
	// `initialPrompt` below auto-fires AgenticChat's in-place fork.
	const handleForkSubmit = useCallback(
		(prompt: string) => {
			setPendingMessage(prompt)
			signInDialogStore.show()
		},
		[signInDialogStore]
	)

	// After login, hand the saved message to AgenticChat as initialPrompt so it auto-submits in-place.
	const initialPrompt = user && pendingMessage ? pendingMessage : undefined

	if (isLoading || !router.isReady) {
		return (
			<Layout title={title} description={description} canonicalUrl={null} noIndex={true}>
				<Head>
					<meta property="og:image" content={ogImageUrl} />
					<meta name="twitter:card" content="summary_large_image" />
					<meta name="twitter:image" content={ogImageUrl} />
				</Head>
				<div className="isolate flex flex-1 flex-col items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-1">
					<p className="flex items-center gap-1 text-center">
						Loading conversation
						<LoadingDots />
					</p>
				</div>
			</Layout>
		)
	}

	if (error || !session) {
		return (
			<Layout
				title="Conversation Not Found - DefiLlama"
				description="The requested conversation could not be found"
				canonicalUrl={null}
				noIndex={true}
			>
				<div className="isolate flex flex-1 flex-col items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-1">
					<div className="text-center">
						<div className="mb-2 text-lg text-(--error)">{error?.message ?? 'Conversation not found'}</div>
						<p className="text-(--text-label)">The conversation may have been made private or the link is invalid.</p>
					</div>
				</div>
			</Layout>
		)
	}

	return (
		<Layout title={title} description={description} canonicalUrl={null} noIndex={true} hideDesktopSearchLlamaAiButton>
			<Head>
				<meta property="og:image" content={ogImageUrl} />
				<meta name="twitter:card" content="summary_large_image" />
				<meta name="twitter:image" content={ogImageUrl} />
			</Head>
			<AgenticChat
				sharedSession={session as any}
				shareToken={shareToken}
				onForkSubmit={handleForkSubmit}
				initialPrompt={initialPrompt}
			/>
			<SignInModal store={signInDialogStore} hideWhenAuthenticated={false} />
		</Layout>
	)
}
