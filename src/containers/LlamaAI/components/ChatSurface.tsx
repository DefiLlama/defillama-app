import { useEffect, useRef, type ReactNode } from 'react'
import { ChatLanding, type ChatLandingProps } from '~/containers/LlamaAI/components/ChatLanding'
import { ConversationView, type ConversationViewModel } from '~/containers/LlamaAI/components/ConversationView'

export interface LandingOverrideApi {
	handleSubmit: ChatLandingProps['handleSubmit']
	isStreaming: boolean
}

interface ChatSurfaceProps {
	showLanding: boolean
	animateLandingTransition: boolean
	animateConversationTransition: boolean
	landingOverride?: ((api: LandingOverrideApi) => ReactNode) | null
	landingProps: ChatLandingProps
	conversationViewModel: ConversationViewModel
	conversationKey: string
	transitionConversationKey: string
}

function renderLanding(landingOverride: ChatSurfaceProps['landingOverride'], landingProps: ChatLandingProps) {
	return landingOverride ? (
		landingOverride({ handleSubmit: landingProps.handleSubmit, isStreaming: landingProps.isStreaming })
	) : (
		<ChatLanding {...landingProps} />
	)
}

export function ChatSurface({
	showLanding,
	animateLandingTransition,
	animateConversationTransition,
	landingOverride,
	landingProps,
	conversationViewModel,
	conversationKey,
	transitionConversationKey
}: ChatSurfaceProps) {
	const exitingLandingRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const node = exitingLandingRef.current as (HTMLDivElement & { inert?: boolean }) | null
		if (!node) return
		node.inert = true
		return () => {
			node.inert = false
		}
	}, [animateLandingTransition])

	if (animateLandingTransition) {
		return (
			<div className="relative flex flex-1 overflow-hidden">
				<div
					ref={exitingLandingRef}
					aria-hidden="true"
					className="pointer-events-none absolute inset-0 motion-safe:animate-[llamaLandingExit_0.42s_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:opacity-0"
				>
					{renderLanding(landingOverride, landingProps)}
				</div>
				<div className="absolute inset-0 flex flex-col motion-safe:animate-[llamaConversationEnter_0.5s_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:animate-none">
					<ConversationView
						key={transitionConversationKey}
						viewModel={conversationViewModel}
						animateActiveExchange={false}
					/>
				</div>
			</div>
		)
	}

	if (showLanding) {
		return renderLanding(landingOverride, landingProps)
	}

	return (
		<ConversationView
			key={conversationKey}
			viewModel={conversationViewModel}
			animateActiveExchange={animateConversationTransition}
		/>
	)
}
