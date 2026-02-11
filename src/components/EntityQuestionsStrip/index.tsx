import * as Ariakit from '@ariakit/react'
import { useRouter } from 'next/router'
import { lazy, Suspense, useState } from 'react'
import { setPendingPrompt, setPendingPageContext } from '~/components/LlamaAIFloatingButton'
import { useAuthContext } from '~/containers/Subscribtion/auth'

interface Props {
	questions: string[]
	entitySlug: string
	entityType: 'protocol' | 'chain' | 'page'
	entityName?: string
}

const SubscribeProModal = lazy(() =>
	import('~/components/SubscribeCards/SubscribeProCard').then((m) => ({ default: m.SubscribeProModal }))
)

export function EntityQuestionsStrip({ questions, entitySlug, entityType, entityName }: Props) {
	const router = useRouter()
	const { isAuthenticated, hasActiveSubscription, loaders } = useAuthContext()
	const [shouldRenderModal, setShouldRenderModal] = useState(false)
	const subscribeModalStore = Ariakit.useDialogStore({ open: shouldRenderModal, setOpen: setShouldRenderModal })

	if (!questions?.length) return null

	const handleClick = (question: string) => {
		if (typeof window !== 'undefined' && (window as any).umami) {
			;(window as any).umami.track('entity-question-click', {
				entitySlug,
				entityType,
				question: question.slice(0, 50),
				page: router.asPath,
				hasSub: isAuthenticated && hasActiveSubscription
			})
		}
		if (!loaders.userLoading && isAuthenticated && hasActiveSubscription) {
			setPendingPrompt(question)
			setPendingPageContext({
				entitySlug,
				entityType,
				route: router.asPath
			})
			router.push('/ai/chat')
		} else {
			subscribeModalStore.show()
		}
	}

	const displayName = entityName || entitySlug

	return (
		<>
			<div className="rounded-md border-l-2 border-l-[#C99A4A] bg-[#FDE0A9]/5 py-2 pr-2 pl-3 dark:border-l-[#FDE0A9] dark:bg-[#FDE0A9]/5">
				<div className="no-scrollbar flex max-w-full touch-pan-x flex-nowrap items-center gap-2 overflow-x-auto [-webkit-overflow-scrolling:touch]">
					<div className="flex shrink-0 items-center gap-1.5">
						<img src="/assets/llamaai/llama-ai.svg" alt="" className="h-4 w-4" />
						<span className="text-xs font-medium whitespace-nowrap text-[#996F1F] dark:text-[#FDE0A9]">
							Ask about {displayName}
						</span>
					</div>
					<div className="flex min-w-max flex-nowrap gap-2">
						{questions.slice(0, 5).map((question, i) => (
							<button
								key={i}
								onClick={() => handleClick(question)}
								className="shrink-0 touch-pan-x rounded-md border border-[#e6e6e6] bg-white px-2.5 py-1.5 text-left text-xs whitespace-nowrap text-[#666] transition-all hover:border-[#C99A4A] hover:bg-[#FDE0A9]/20 hover:text-[#996F1F] dark:border-[#39393E] dark:bg-[#222429] dark:text-[#919296] dark:hover:border-[#FDE0A9]/50 dark:hover:bg-[#FDE0A9]/10 dark:hover:text-[#FDE0A9]"
							>
								{question}
							</button>
						))}
					</div>
				</div>
			</div>
			{shouldRenderModal ? (
				<Suspense fallback={<></>}>
					<SubscribeProModal dialogStore={subscribeModalStore} />
				</Suspense>
			) : null}
		</>
	)
}
