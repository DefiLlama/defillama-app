import { useMutation } from '@tanstack/react-query'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { Icon } from '~/components/Icon'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { subscribeToLocalStorage } from '~/contexts/LocalStorage'
import Layout from '~/layout'

async function fetchPromptResponse(prompt: string) {
	try {
		await new Promise((resolve) => setTimeout(resolve, 2000))
		return { prompt, response: new Array(10).fill(prompt).join(', ') }
	} catch (error) {
		console.log(error)
		throw new Error(error instanceof Error ? error.message : 'Failed to fetch prompt response')
	}
}

const promptStorageKey = 'llama-ai'
export default function LlamaAI() {
	const [showChat, setShowChat] = useState(true)

	const [prompt, setPrompt] = useState('')

	const {
		data: promptResponse,
		mutateAsync: submitPrompt,
		isPending,
		error,
		reset: resetPrompt
	} = useMutation({
		mutationFn: fetchPromptResponse,
		onMutate: (prompt) => {
			const prevPrompt = JSON.parse(window.localStorage.getItem(promptStorageKey) ?? '[]') as string[]
			const newPrompts = [...prevPrompt, prompt]
			window.localStorage.setItem(promptStorageKey, JSON.stringify(newPrompts))
			window.dispatchEvent(new Event('storage'))
		},
		onSuccess: () => {
			setPrompt('')
		}
	})

	const prevPromptsInStorage = useSyncExternalStore(
		subscribeToLocalStorage,
		() => localStorage.getItem(promptStorageKey) ?? '[]',
		() => '[]'
	)

	const prevPrompts = useMemo(() => {
		const data = JSON.parse(prevPromptsInStorage) as string[]
		return Array.isArray(data) ? data : [data]
	}, [prevPromptsInStorage])

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		const form = e.target as HTMLFormElement
		setPrompt(form.prompt.value)
		submitPrompt(form.prompt.value)
		form.reset()
	}

	const isSubmitted = isPending || error || promptResponse ? true : false

	return (
		<Layout title="LlamaAI" defaultSEO>
			<ProtocolsChainsSearch hideFilters />
			<div className={showChat ? 'grid grid-cols-2 lg:grid-cols-3 gap-2 h-full' : 'flex gap-2 h-full'}>
				{showChat ? (
					<div className="hidden lg:flex flex-col gap-3 col-span-1 bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-3">
						<div className="flex items-center gap-2">
							<button
								className="flex items-center justify-center rounded-md gap-2 px-2 py-1 bg-[rgba(31,103,210,0.12)] border border-[var(--old-blue)] text-[var(--old-blue)] flex-1"
								onClick={() => {
									setPrompt('')
									resetPrompt()
								}}
							>
								<Icon name="message-square-plus" height={16} width={16} />
								<span>New Chat</span>
							</button>
							<button
								className="flex items-center justify-center rounded-md gap-2 px-2 py-[6px] bg-[rgba(31,103,210,0.12)] border border-[var(--old-blue)] text-[var(--old-blue)]"
								onClick={() => setShowChat((prev) => !prev)}
							>
								<Icon name="arrow-left-to-line" height={16} width={16} />
								<span className="sr-only">Hide chat history</span>
							</button>
						</div>
						<div className="flex flex-col gap-2">
							<h1 className="text-[#666] dark:text-[#919296]">Chats</h1>
							{prevPrompts.length === 0 ? (
								<p className="p-4 text-center border border-dashed rounded-md text-[#666] dark:text-[#919296] border-[#666]/50 dark:border-[#919296]/50">
									You don’t have any chats yet
								</p>
							) : (
								<div className="flex flex-col w-full items-start gap-2">
									{prevPrompts.map((prevP) => (
										<button
											key={prevP}
											className={
												prevP == promptResponse?.prompt
													? 'bg-[#666]/10 dark:bg-[#919296]/10 rounded-md p-1 -ml-1 w-full text-start'
													: 'p-1 -ml-1 w-full text-start'
											}
											onClick={() => {
												if (prevP == promptResponse?.prompt || isPending) return
												setPrompt(prevP)
												submitPrompt(prevP)
											}}
										>
											{prevP}
										</button>
									))}
								</div>
							)}
						</div>
					</div>
				) : (
					<div className="bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-3">
						<button
							className="flex items-center justify-center rounded-md gap-2 px-2 py-[6px] bg-[rgba(31,103,210,0.12)] border border-[var(--old-blue)] text-[var(--old-blue)]"
							onClick={() => setShowChat((prev) => !prev)}
						>
							<Icon name="message-square-plus" height={16} width={16} />
							<span className="sr-only">Show chat history</span>
						</button>
					</div>
				)}
				<div className="flex-1 col-span-2 flex flex-col items-center justify-start gap-3 bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-3 relative overflow-auto">
					{isSubmitted ? (
						<div className="flex flex-col gap-3 mb-auto w-full">
							<h1 className="bg-[var(--app-bg)] rounded-lg p-4 w-full">{promptResponse?.prompt ?? prompt}</h1>
							<div className="flex flex-col gap-[10px]">
								<PromptResponse response={promptResponse?.response} isPending={isPending} />
							</div>
						</div>
					) : (
						<>
							<img
								src="/icons/llama-ai.svg"
								alt="LlamaAI"
								className="object-contain pt-[100px]"
								width={64}
								height={77}
							/>
							<h1 className="text-2xl font-semibold">What can I help you with ?</h1>
						</>
					)}
					<form className="w-full" onSubmit={handleSubmit}>
						<span className="relative">
							<textarea
								name="prompt"
								className="min-h-[100px] bg-[var(--app-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-4 w-full"
								placeholder="Ask LlamaAI..."
								disabled={isPending}
							/>
							<button
								className="flex items-center justify-center rounded-md gap-2 h-6 w-6 bg-[rgba(31,103,210,0.12)] border border-[var(--old-blue)] text-[var(--old-blue)] absolute bottom-3 right-2"
								disabled={isPending}
							>
								<Icon name="arrow-up" height={16} width={16} />
								<span className="sr-only">Show chat history</span>
							</button>
						</span>
					</form>
					{!isSubmitted ? (
						<div className="flex items-center gap-4 justify-around flex-wrap w-full pb-[100px]">
							{recommendedPrompts.map((prompt) => (
								<button
									key={prompt}
									onClick={() => {
										setPrompt(prompt)
										submitPrompt(prompt)
									}}
									disabled={isPending}
									className="flex items-center justify-center rounded-lg gap-2 px-4 py-1 text-[#666] dark:text-[#919296] border border-[#e6e6e6] dark:border-[#222324]"
								>
									{prompt}
								</button>
							))}
						</div>
					) : null}
				</div>
			</div>
		</Layout>
	)
}

const recommendedPrompts = [
	'Top 5 protocols by tvl',
	'Top 5 tokenless projects',
	'Chains ranked by app fees',
	'Biggest TVL gainers'
]

function useProgressiveWords(text: string, delay = 15) {
	const [displayed, setDisplayed] = useState('')
	useEffect(() => {
		if (!text) {
			setDisplayed('')
			return
		}
		const words = text.split(' ')
		let current = 0
		setDisplayed('')
		const interval = setInterval(() => {
			current++
			setDisplayed(words.slice(0, current).join(' '))
			if (current >= words.length) clearInterval(interval)
		}, delay)
		return () => clearInterval(interval)
	}, [text, delay])
	return displayed
}

const PromptResponse = ({ response, isPending }: { response?: string; isPending: boolean }) => {
	const animatedResponse = useProgressiveWords(response ?? '', 15)

	return <p>{isPending ? 'Loading...' : animatedResponse}</p>
}
