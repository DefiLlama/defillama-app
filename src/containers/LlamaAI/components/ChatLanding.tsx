import type { Dispatch, RefObject, SetStateAction } from 'react'
import { PromptInput } from '~/containers/LlamaAI/components/PromptInput'
import { RecommendedPrompts } from '~/containers/LlamaAI/components/RecommendedPrompts'

interface ChatLandingProps {
	readOnly: boolean
	title: string
	handleSubmit: (
		prompt: string,
		preResolvedEntities?: Array<{ term: string; slug: string }>,
		images?: Array<{ data: string; mimeType: string; filename?: string }>
	) => void | Promise<void>
	promptInputRef: RefObject<HTMLTextAreaElement>
	handleStopRequest: () => void
	isStreaming: boolean
	isResearchMode: boolean
	setIsResearchMode: Dispatch<SetStateAction<boolean>>
	onOpenAlerts: () => void
}

export function ChatLanding({
	readOnly,
	title,
	handleSubmit,
	promptInputRef,
	handleStopRequest,
	isStreaming,
	isResearchMode,
	setIsResearchMode,
	onOpenAlerts
}: ChatLandingProps) {
	return (
		<div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-2.5">
			<div className="mt-[100px] flex shrink-0 flex-col items-center justify-center gap-2.5 max-lg:mt-[50px]">
				<img src="/assets/llamaai/llama-ai.svg" alt="LlamaAI" className="object-contain" width={64} height={77} />
				<h1 className="text-center text-2xl font-semibold">{title}</h1>
			</div>
			{!readOnly ? (
				<>
					<PromptInput
						handleSubmit={handleSubmit}
						promptInputRef={promptInputRef}
						isPending={false}
						handleStopRequest={handleStopRequest}
						isStreaming={isStreaming}
						restoreRequest={null}
						placeholder="Ask LlamaAI... Type @ to add a protocol, chain or stablecoin, or $ to add a coin"
						isResearchMode={isResearchMode}
						setIsResearchMode={setIsResearchMode}
						researchUsage={null}
						onOpenAlerts={onOpenAlerts}
					/>
					<RecommendedPrompts onSubmit={handleSubmit} isPending={isStreaming} isResearchMode={isResearchMode} />
				</>
			) : null}
		</div>
	)
}
