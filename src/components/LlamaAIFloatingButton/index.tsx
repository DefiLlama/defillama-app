import * as Ariakit from '@ariakit/react'
import { useRouter } from 'next/router'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useSuggestedQuestions } from '~/containers/LlamaAI/hooks/useSuggestedQuestions'
import { useMedia } from '~/hooks/useMedia'

export const PENDING_PROMPT_KEY = 'llamaai-pending-prompt'

const FALLBACK_SUGGESTIONS = [
	'Which protocols have growing TVL and revenue but declining token prices?',
	'What are the best stablecoin yields with at least $10M TVL?',
	'Chart Pump.fun percentage share of total revenue across all launchpads'
]

// Config for contextual pages and where to find the entity name in pageProps
const CONTEXTUAL_PAGE_CONFIG = [
	{ prefix: '/protocol/', getName: (props: any) => props?.name },
	{ prefix: '/chain/', getName: (props: any) => props?.metadata?.name },
	{ prefix: '/stablecoin/', getName: (props: any) => props?.peggedAssetData?.name }
]

function getEntityName(pathname: string, pageProps: any): string | null {
	for (const { prefix, getName } of CONTEXTUAL_PAGE_CONFIG) {
		if (pathname.startsWith(prefix)) {
			return getName(pageProps) || null
		}
	}
	return null
}

export function setPendingPrompt(prompt: string) {
	if (typeof window !== 'undefined') {
		localStorage.setItem(PENDING_PROMPT_KEY, prompt)
	}
}

export function consumePendingPrompt(): string | null {
	if (typeof window === 'undefined') return null
	const prompt = localStorage.getItem(PENDING_PROMPT_KEY)
	if (prompt) {
		localStorage.removeItem(PENDING_PROMPT_KEY)
	}
	return prompt
}

export function LlamaAIFloatingButton({ pageProps }: { pageProps?: any }) {
	const router = useRouter()
	const [isOpen, setIsOpen] = useState(false)
	const [value, setValue] = useState('')
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const isDesktop = useMedia('(min-width: 768px)')
	const { data: suggestedData } = useSuggestedQuestions(isOpen)

	const entityName = useMemo(() => getEntityName(router.pathname, pageProps), [router.pathname, pageProps])

	const contextualPrompt = useMemo(() => {
		if (!entityName) return null
		return `Give me a comprehensive overview of ${entityName}.`
	}, [entityName])

	const suggestions = useMemo(() => {
		let basePrompts: string[]

		if (!suggestedData?.categories) {
			basePrompts = FALLBACK_SUGGESTIONS
		} else {
			const allPrompts: string[] = []
			Object.values(suggestedData.categories).forEach((prompts) => {
				if (Array.isArray(prompts)) {
					allPrompts.push(...prompts.slice(0, 2))
				}
			})
			basePrompts = allPrompts.length > 0 ? allPrompts.slice(0, 4) : FALLBACK_SUGGESTIONS
		}

		if (contextualPrompt) {
			return [contextualPrompt, ...basePrompts.slice(0, 4)]
		}

		return basePrompts.slice(0, 4)
	}, [suggestedData, contextualPrompt])

	const handleSubmit = useCallback(
		(e?: React.FormEvent) => {
			e?.preventDefault()
			const prompt = value.trim()
			if (!prompt) return

			if (typeof window !== 'undefined' && (window as any).umami) {
				;(window as any).umami.track('llamaai-fab-submit')
			}

			setPendingPrompt(prompt)
			router.push('/ai/chat')
			setIsOpen(false)
			setValue('')
		},
		[value, router]
	)

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault()
				handleSubmit()
			}
			if (e.key === 'Escape') {
				setIsOpen(false)
			}
		},
		[handleSubmit]
	)

	const handleButtonClick = useCallback(() => {
		if (typeof window !== 'undefined' && (window as any).umami) {
			;(window as any).umami.track('llamaai-fab-click')
		}
		setIsOpen(true)
	}, [])

	return (
		<>
			<Ariakit.TooltipProvider>
				<Ariakit.TooltipAnchor
					render={
						<button
							onClick={handleButtonClick}
							className="fixed right-6 bottom-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95"
							style={{
								background: 'linear-gradient(135deg, #FDE0A9 0%, #FBEDCB 50%, #FDE0A9 100%)',
								boxShadow: '0 4px 20px rgba(253, 224, 169, 0.5), 0 2px 8px rgba(0, 0, 0, 0.1)'
							}}
							aria-label="Ask LlamaAI"
						>
							<img
								src="/assets/llamaai/llama-ai.svg"
								alt=""
								className="h-8 w-8 object-contain"
								style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
							/>
						</button>
					}
				/>
				<Ariakit.Tooltip className="z-50 rounded-lg bg-[#222] px-3 py-2 text-sm text-white shadow-lg dark:bg-[#f5f5f5] dark:text-black">
					Ask LlamaAI
				</Ariakit.Tooltip>
			</Ariakit.TooltipProvider>

			<Ariakit.DialogProvider open={isOpen} setOpen={setIsOpen}>
				<Ariakit.Dialog
					portal
					unmountOnHide
					autoFocusOnShow={() => {
						textareaRef.current?.focus()
						return false
					}}
					backdrop={<div className="fixed inset-0 z-40 bg-black/30" />}
					className={
						isDesktop
							? 'fixed top-0 right-0 z-50 flex h-full w-[400px] flex-col border-l border-[#e6e6e6] bg-white shadow-2xl dark:border-[#39393E] dark:bg-[#222429]'
							: 'fixed right-0 bottom-0 left-0 z-50 flex max-h-[70vh] flex-col rounded-t-2xl border-t border-[#e6e6e6] bg-white shadow-2xl dark:border-[#39393E] dark:bg-[#222429]'
					}
				>
					<div className="flex items-center gap-3 border-b border-[#e6e6e6] px-5 py-4 dark:border-[#39393E]">
						<div
							className="flex h-10 w-10 items-center justify-center rounded-full"
							style={{ background: 'linear-gradient(135deg, #FDE0A9 0%, #FBEDCB 100%)' }}
						>
							<img src="/assets/llamaai/llama-ai.svg" alt="" className="h-6 w-6 object-contain" />
						</div>
						<div className="flex-1">
							<h3 className="text-base font-semibold text-black dark:text-white">Ask LlamaAI</h3>
							<p className="text-sm text-[#666] dark:text-[#919296]">AI-powered DeFi insights</p>
						</div>
						<Ariakit.DialogDismiss className="rounded-full p-2 text-[#666] transition-colors hover:bg-[#f7f7f7] hover:text-black dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-white">
							<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<path d="M18 6L6 18M6 6l12 12" />
							</svg>
						</Ariakit.DialogDismiss>
					</div>

					<div className="flex flex-1 flex-col overflow-hidden">
						<div className="flex-1 overflow-y-auto p-5">
							<div className="mb-4">
								<p className="mb-3 text-sm text-[#666] dark:text-[#919296]">Try one of these:</p>
								<div className="flex flex-col gap-2">
									{suggestions.map((suggestion) => (
										<button
											key={suggestion}
											type="button"
											onClick={() => setValue(suggestion)}
											className="rounded-lg border border-[#e6e6e6] bg-[#f9f9f9] px-3 py-2 text-left text-xs text-[#666] transition-colors hover:border-[#ccc] hover:bg-[#f0f0f0] dark:border-[#39393E] dark:bg-[#1a1a1d] dark:text-[#919296] dark:hover:border-[#555] dark:hover:bg-[#2a2a2d]"
										>
											{suggestion}
										</button>
									))}
								</div>
							</div>
						</div>

						<form onSubmit={handleSubmit} className="border-t border-[#e6e6e6] p-4 dark:border-[#39393E]">
							<div className="relative">
								<textarea
									ref={textareaRef}
									value={value}
									onChange={(e) => setValue(e.target.value)}
									onKeyDown={handleKeyDown}
									placeholder="Ask LlamaAI about TVL, fees, revenue, protocols..."
									className="min-h-[100px] w-full resize-none rounded-lg border border-[#e6e6e6] bg-[#f9f9f9] p-3 pr-12 text-sm text-black placeholder-[#999] transition-colors outline-none focus:border-[#2172E5] dark:border-[#39393E] dark:bg-[#1a1a1d] dark:text-white dark:placeholder-[#666]"
									rows={4}
								/>
								<button
									type="submit"
									disabled={!value.trim()}
									className="absolute right-3 bottom-3 flex h-9 w-9 items-center justify-center rounded-lg transition-all disabled:opacity-40"
									style={{
										background: value.trim() ? 'linear-gradient(135deg, #FDE0A9 0%, #FBEDCB 100%)' : 'transparent'
									}}
								>
									<svg
										className="h-5 w-5 text-black"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
									>
										<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
									</svg>
								</button>
							</div>
							<p className="mt-2 text-xs text-[#999] dark:text-[#666]">
								Press <kbd className="rounded bg-[#eee] px-1 font-mono dark:bg-[#333]">Enter</kbd> to submit
							</p>
						</form>
					</div>
				</Ariakit.Dialog>
			</Ariakit.DialogProvider>
		</>
	)
}
