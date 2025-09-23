import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { LoadingDots } from '~/components/Loaders'
import { MCP_SERVER } from '~/constants'
import { LlamaAI } from '~/containers/LlamaAI'
import Layout from '~/layout'

interface SharedSession {
	session: {
		sessionId: string
		title: string
		createdAt: string
		isPublic: boolean
	}
	conversationHistory: Array<{
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

export default function SharedConversationPage() {
	const router = useRouter()
	const { shareToken } = router.query
	const [session, setSession] = useState<SharedSession | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (!shareToken || typeof shareToken !== 'string') return

		fetch(`${MCP_SERVER}/user/public/${shareToken}`)
			.then(async (res) => {
				if (!res.ok) {
					throw new Error('Shared conversation not found')
				}
				return res.json()
			})
			.then((data) => {
				setSession(data)
				setIsLoading(false)
			})
			.catch((err) => {
				setError(err.message)
				setIsLoading(false)
			})
	}, [shareToken])

	if (isLoading) {
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
						<div className="mb-2 text-lg text-(--error)">{error || 'Conversation not found'}</div>
						<p className="text-(--text-label)">The conversation may have been made private or the link is invalid.</p>
					</div>
				</div>
			</Layout>
		)
	}

	return <LlamaAI sharedSession={session} isPublicView={true} readOnly={true} />
}
