import * as Ariakit from '@ariakit/react'
import { useRouter } from 'next/router'
import { lazy, Suspense, useState } from 'react'
import { setPendingPrompt, setPendingPageContext, setPendingSuggestedFlag } from '~/components/LlamaAIFloatingButton'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { trackUmamiEvent } from '~/utils/analytics/umami'

interface Props {
	questions: string[]
	entitySlug: string
	entityType: 'protocol' | 'chain' | 'page'
	entityName?: string
	isLoading?: boolean
}

const SignInForm = lazy(() => import('~/containers/Subscribtion/SignIn').then((m) => ({ default: m.SignInForm })))
const WalletProvider = lazy(() => import('~/layout/WalletProvider').then((m) => ({ default: m.WalletProvider })))

export function EntityQuestionsStrip({ questions, entitySlug, entityType, entityName, isLoading }: Props) {
	const router = useRouter()
	const { isAuthenticated, hasActiveSubscription, loaders } = useAuthContext()
	const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)
	const [isOpen, setIsOpen] = useState(false)
	const signInDialogStore = Ariakit.useDialogStore({ open: isOpen, setOpen: setIsOpen })

	if (!isLoading && !questions?.length) return null

	const handleClick = (question: string) => {
		trackUmamiEvent('llamaai-entity-question-click', {
			entitySlug,
			entityType,
			question: question.slice(0, 50),
			page: router.asPath,
			hasSub: isAuthenticated && hasActiveSubscription
		})
		if (!loaders.userLoading && isAuthenticated) {
			setPendingPrompt(question)
			setPendingSuggestedFlag()
			setPendingPageContext({
				entitySlug,
				entityType,
				route: router.asPath
			})
			void router.push('/ai/chat')
		} else {
			setPendingPrompt(question)
			setPendingSuggestedFlag()
			setPendingPageContext({
				entitySlug,
				entityType,
				route: router.asPath
			})
			setPendingQuestion(question)
			signInDialogStore.show()
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
						{isLoading
							? [120, 160, 140, 180, 130].map((w, i) => (
									<div
										key={`skeleton-${i}`}
										style={{ width: w }}
										className="relative isolate h-[30px] shrink-0 overflow-hidden rounded-md border border-[#e6e6e6] bg-[#f0f0f0] dark:border-[#39393E] dark:bg-[#2a2a2f]"
									>
										<div className="pointer-events-none absolute inset-y-0 -right-1/2 -left-1/2 animate-shimmer bg-[linear-gradient(99.97deg,transparent,rgba(0,0,0,0.08),transparent)] dark:bg-[linear-gradient(99.97deg,transparent,rgba(255,255,255,0.08),transparent)]" />
									</div>
								))
							: questions.map((question) => (
									<button
										key={`q-string-${question}`}
										onClick={() => handleClick(question)}
										className="shrink-0 touch-pan-x rounded-md border border-[#e6e6e6] bg-white px-2.5 py-1.5 text-left text-xs whitespace-nowrap text-[#666] transition-all hover:border-[#C99A4A] hover:bg-[#FDE0A9]/20 hover:text-[#996F1F] dark:border-[#39393E] dark:bg-[#222429] dark:text-[#919296] dark:hover:border-[#FDE0A9]/50 dark:hover:bg-[#FDE0A9]/10 dark:hover:text-[#FDE0A9]"
									>
										{question}
									</button>
								))}
					</div>
				</div>
			</div>
			{isOpen ? (
				<Suspense fallback={null}>
					<WalletProvider>
						<Ariakit.Dialog
							store={signInDialogStore}
							className="dialog flex max-h-[90dvh] max-w-md flex-col overflow-y-auto rounded-xl border border-[#2a2a2e] bg-[#1a1b1f] shadow-2xl max-sm:drawer max-sm:rounded-b-none"
							unmountOnHide
						>
							{/* Branded header */}
							<div className="shrink-0 border-b border-[#2a2a2e] px-5 pt-5 pb-4">
								<div className="flex flex-col items-center gap-2.5 text-center">
									<img src="/assets/llamaai/llama-ai.svg" alt="" className="h-9 w-9" />
									<div>
										<p className="text-[15px] font-bold text-white">Try LlamaAI for free</p>
										<p className="mt-0.5 text-[13px] text-[#919296]">
											Sign in to get <span className="font-semibold text-[#FDE0A9]">3 free AI-answered questions</span>{' '}
											per day
										</p>
									</div>
								</div>
								{pendingQuestion ? (
									<div className="mt-3 rounded-lg border border-[#FDE0A9]/15 bg-[#FDE0A9]/5 px-3 py-2">
										<p className="text-[12px] leading-relaxed text-[#c8c8cc]">
											&ldquo;{pendingQuestion.length > 100 ? `${pendingQuestion.slice(0, 100)}...` : pendingQuestion}
											&rdquo;
										</p>
									</div>
								) : null}
							</div>
							{/* Sign-in form */}
							<div className="p-4 sm:p-6">
								<SignInForm dialogStore={signInDialogStore} returnUrl="/ai/chat" />
							</div>
						</Ariakit.Dialog>
					</WalletProvider>
				</Suspense>
			) : null}
		</>
	)
}
