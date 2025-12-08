import { useRouter } from 'next/router'
import { useQuery } from '@tanstack/react-query'
import { LoadingDots } from '~/components/Loaders'
import { MCP_SERVER } from '~/constants'
import { LlamaAI } from '~/containers/LlamaAI'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import Layout from '~/layout'
import { fetchJson } from '~/utils/async'

interface SharedSession {
	session: {
		sessionId: string
		title: string
		createdAt: string
		isPublic: boolean
	}
	messages: Array<{
		question: string
		response: {
			answer: string
			metadata?: any
			suggestions?: any[]
			charts?: any[]
			chartData?: any[]
		}
		messageId?: string
		timestamp: number
	}>
	isPublicView: true
}

export const getStaticPaths = async () => {
	return {
		paths: [],
		fallback: 'blocking'
	}
}

export const getStaticProps = async () => {
	return {
		props: {},
		revalidate: false
	}
}

async function getSharedSession(shareToken: string) {
	try {
		if (!shareToken) {
			return null
		}
		const data = await fetchJson(`${MCP_SERVER}/user/public/${shareToken}`)
		return data as SharedSession
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Failed to fetch shared session')
	}
}

export default function SharedConversationPage() {
	const router = useRouter()
	const { shareToken } = router.query
	const { user } = useAuthContext()

	const {
		data: session,
		isLoading,
		error
	} = useQuery({
		queryKey: ['shared-session', shareToken],
		queryFn: () => getSharedSession(shareToken as string),
		enabled: !!shareToken && typeof shareToken === 'string',
		staleTime: Infinity,
		refetchOnWindowFocus: false,
		retry: false
	})

	if (isLoading || !router.isReady) {
		return (
			<Layout
				title="LlamaAI - DefiLlama"
				description="Get AI-powered answers about chains, protocols, metrics like TVL, fees, revenue, and compare them based on your prompts"
			>
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
			<Layout title="Conversation Not Found - DefiLlama" description="The requested conversation could not be found">
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
		<LlamaAI
			sharedSession={session}
			isPublicView={true}
			readOnly={true}
			showDebug={user?.flags?.['is_llama'] ?? false}
		/>
	)
}
