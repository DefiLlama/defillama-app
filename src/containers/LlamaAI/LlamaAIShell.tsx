import { type ReactElement, type ReactNode } from 'react'
import { LoadingDots } from '~/components/Loaders'
import { AgenticChat } from '~/containers/LlamaAI'
import { useAuthContext } from '~/containers/Subscription/auth'
import { LlamaAINavigateProvider } from '~/contexts/LlamaAINavigate'
import { LlamaAIRouteProvider, useLlamaAIRouteState, type LlamaAIRouteState } from '~/contexts/LlamaAIRouteState'
import { SessionAliasProvider } from '~/contexts/SessionAliasRegistry'
import Layout from '~/layout'

const CHAT_SEO = {
	title: 'AI Crypto Analysis - DeFi & TradFi Data - LlamaAI',
	description:
		'Get AI-powered answers about chains, protocols, metrics like TVL, fees, revenue, and compare them based on your prompts',
	canonicalUrl: null,
	noIndex: true
} as const

const PROJECT_SEO = {
	title: 'Project - LlamaAI',
	description: 'Project workspace',
	canonicalUrl: null,
	noIndex: true
} as const

const PROJECTS_SEO = {
	title: 'Projects - LlamaAI',
	description: 'Manage knowledge projects for LlamaAI chats',
	canonicalUrl: null,
	noIndex: true
} as const

function seoFromRoute(route: LlamaAIRouteState) {
	if (route.kind === 'project-list') return PROJECTS_SEO
	return route.kind === 'project' ? PROJECT_SEO : CHAT_SEO
}

function LoadingState() {
	return (
		<div className="isolate flex flex-1 flex-col items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-1">
			<p className="flex items-center gap-1 text-center">
				Loading
				<LoadingDots />
			</p>
		</div>
	)
}

export function LlamaAIShell({ children }: { children: ReactNode }) {
	const route = useLlamaAIRouteState()
	const { user, loaders } = useAuthContext()
	const userId = user?.id ?? null
	const shouldMountChat = !!user && !loaders.userLoading && route.kind !== 'unknown'

	return (
		<Layout {...seoFromRoute(route)} hideDesktopSearchLlamaAiButton>
			<LlamaAINavigateProvider>
				<SessionAliasProvider userId={userId}>
					<LlamaAIRouteProvider value={route}>
						{loaders.userLoading ? <LoadingState /> : null}
						{shouldMountChat ? <AgenticChat /> : null}
						{children}
					</LlamaAIRouteProvider>
				</SessionAliasProvider>
			</LlamaAINavigateProvider>
		</Layout>
	)
}

LlamaAIShell.getLayout = (page: ReactElement) => <LlamaAIShell>{page}</LlamaAIShell>
