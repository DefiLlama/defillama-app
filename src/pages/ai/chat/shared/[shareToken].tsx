import Head from 'next/head'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { LoadingDots } from '~/components/Loaders'
import { MCP_SERVER } from '~/constants'
import { AgenticChat } from '~/containers/LlamaAI'
import Layout from '~/layout'
import { fetchJson } from '~/utils/async'

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

export const getServerSideProps = async ({ params }: { params: { shareToken: string } }) => {
	const { shareToken } = params

	let sessionTitle: string | null = null
	try {
		const data = await fetchJson<SharedSession>(`${MCP_SERVER}/user/public/${shareToken}`)
		sessionTitle = data?.session?.title || null
	} catch {
		// Session might not exist or be private — page will handle the error state
	}

	return {
		props: { shareToken, sessionTitle }
	}
}

async function getSharedSession(shareToken: string) {
	try {
		if (!shareToken) {
			return null
		}
		return await fetchJson<SharedSession>(`${MCP_SERVER}/user/public/${shareToken}`)
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Failed to fetch shared session')
	}
}

export default function SharedConversationPage({ shareToken: ssrToken, sessionTitle }: PageProps) {
	const router = useRouter()
	const shareToken = (router.query.shareToken as string) || ssrToken

	const ogImageUrl = `${MCP_SERVER}/user/og/${shareToken}`
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
			<Layout title="Conversation Not Found - DefiLlama" description="The requested conversation could not be found" canonicalUrl={null} noIndex={true}>
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
		<Layout title={title} description={description} canonicalUrl={null} noIndex={true}>
			<Head>
				<meta property="og:image" content={ogImageUrl} />
				<meta name="twitter:card" content="summary_large_image" />
				<meta name="twitter:image" content={ogImageUrl} />
			</Head>
			<AgenticChat sharedSession={session as any} readOnly />
		</Layout>
	)
}
