import { useMutation } from '@tanstack/react-query'
import { useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Icon } from '~/components/Icon'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { subscribeToLocalStorage } from '~/contexts/LocalStorage'
import Layout from '~/layout'
import * as Ariakit from '@ariakit/react'
import { getAnchorRect, getSearchValue, getTrigger, getTriggerOffset, replaceValue } from './utils'
import { matchSorter } from 'match-sorter'
import { getList, getValue } from './list'

async function fetchPromptResponse({
	userQuestion,
	matchedEntities
}: {
	userQuestion: string
	matchedEntities?: Record<string, string[]>
}) {
	try {
		const data = await fetch('https://ask.llama.fi/ask', {
			method: 'POST',
			body: JSON.stringify({
				user_question: userQuestion,
				matched_entities: matchedEntities ?? {}
			})
		}).then((res) => res.json())

		if (data.error) {
			throw new Error(data.error)
		}

		return { prompt: userQuestion, response: data as { answer: string } }
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Failed to fetch prompt response')
	}
}

const promptStorageKey = 'llama-ai'

export function LlamaAI({ searchData }: { searchData: { label: string; slug: string }[] }) {
	const [showChat, setShowChat] = useState(true)

	const [prompt, setPrompt] = useState('')
	const [entities, setEntities] = useState<string[]>([])

	const {
		data: promptResponse,
		mutate: submitPrompt,
		isPending,
		error,
		reset: resetPrompt
	} = useMutation({
		mutationFn: fetchPromptResponse,
		onMutate: ({ userQuestion }) => {
			// const prevPrompt = JSON.parse(window.localStorage.getItem(promptStorageKey) ?? '[]') as string[]
			// const newPrompts = [...prevPrompt, `${Date.now()}--${userQuestion}`]
			// window.localStorage.setItem(promptStorageKey, JSON.stringify(newPrompts))
			// window.dispatchEvent(new Event('storage'))
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
		submitPrompt({
			userQuestion: form.prompt.value,
			matchedEntities: entities.reduce((acc, entity) => {
				const [name, slug] = entity.split(':')
				const [entityName, entitySlug] = slug.split('=')
				acc[entityName] = [entitySlug]
				return acc
			}, {} as Record<string, string[]>)
		})
		form.reset()
	}

	const isSubmitted = isPending || error || promptResponse ? true : false

	return (
		<Layout title="LlamaAI" defaultSEO>
			<ProtocolsChainsSearch hideFilters />
			<div className={showChat ? 'grid grid-cols-2 lg:grid-cols-2 gap-2 h-full flex-1' : 'flex gap-2 h-full flex-1'}>
				{/* {showChat ? (
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
											data-active={prevP == promptResponse?.prompt}
											className="rounded-md p-1 -ml-1 w-full text-start data-[active=true]:bg-[#666]/20 data-[active=true]:dark:bg-[#919296]/20 hover:bg-[#666]/10 hover:dark:bg-[#919296]/10 focus-visible:bg-[#666]/10 focus-visible:dark:bg-[#919296]/10"
											onClick={() => {
												if (prevP == promptResponse?.prompt || isPending) return
												setPrompt(prevP)
												submitPrompt({ userQuestion: prevP })
											}}
										>
											{prevP.split('--')[1] ?? prevP}
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
				)} */}
				<div className="flex-1 col-span-2 flex flex-col items-center justify-start gap-3 bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-3 relative overflow-auto">
					{isSubmitted ? (
						<div className="flex flex-col gap-3 mb-auto w-full">
							<h1 className="bg-[var(--app-bg)] rounded-lg p-4 w-full">{promptResponse?.prompt ?? prompt}</h1>
							<div className="flex flex-col gap-[10px]">
								<PromptResponse response={promptResponse?.response} error={error?.message} isPending={isPending} />
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
					<PromptInput
						handleSubmit={handleSubmit}
						isPending={isPending}
						searchData={searchData}
						setEntities={setEntities}
					/>
					{!isSubmitted ? (
						<div className="flex items-center gap-4 justify-around flex-wrap w-full pb-[100px]">
							{recommendedPrompts.map((prompt) => (
								<button
									key={prompt}
									onClick={() => {
										setPrompt(prompt)
										submitPrompt({ userQuestion: prompt })
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

const PromptInput = ({
	handleSubmit,
	isPending,
	searchData,
	setEntities
}: {
	handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
	isPending: boolean
	searchData: any
	setEntities: React.Dispatch<React.SetStateAction<string[]>>
}) => {
	const ref = useRef<HTMLTextAreaElement>(null)
	const [value, setValue] = useState('')
	const [trigger, setTrigger] = useState<string | null>(null)
	const [caretOffset, setCaretOffset] = useState<number | null>(null)

	const combobox = Ariakit.useComboboxStore()

	const searchValue = Ariakit.useStoreState(combobox, 'value')
	const deferredSearchValue = useDeferredValue(searchValue)

	const matches = useMemo(() => {
		return matchSorter(getList(trigger, searchData), deferredSearchValue, {
			baseSort: (a, b) => (a.index < b.index ? -1 : 1)
		}).slice(0, 10)
	}, [trigger, deferredSearchValue])

	const hasMatches = !!matches.length

	useLayoutEffect(() => {
		combobox.setOpen(hasMatches)
	}, [combobox, hasMatches])

	useLayoutEffect(() => {
		if (caretOffset != null) {
			ref.current?.setSelectionRange(caretOffset, caretOffset)
		}
	}, [caretOffset])

	// Re-calculates the position of the combobox popover in case the changes on
	// the textarea value have shifted the trigger character.
	useEffect(combobox.render, [combobox, value])

	const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
			combobox.hide()
		}
	}

	const onChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
		const trigger = getTrigger(event.target)
		const searchValue = getSearchValue(event.target)
		// If there's a trigger character, we'll show the combobox popover. This can
		// be true both when the trigger character has just been typed and when
		// content has been deleted (e.g., with backspace) and the character right
		// before the caret is the trigger.
		if (trigger) {
			setTrigger(trigger)
			combobox.show()
		}
		// There will be no trigger and no search value if the trigger character has
		// just been deleted.
		else if (!searchValue) {
			setTrigger(null)
			combobox.hide()
		}
		// Sets our textarea value.
		setValue(event.target.value)
		// Sets the combobox value that will be used to search in the list.
		combobox.setValue(searchValue)
	}

	const onItemClick = (value: string) => () => {
		const textarea = ref.current
		if (!textarea) return
		const offset = getTriggerOffset(textarea)
		const itemValue: { listValue: string; slug: string; value: string } = getValue(value, trigger, searchData)
		if (!itemValue) return
		setEntities((prev) => [...prev, `${itemValue.value}:${itemValue.slug}`])
		setTrigger(null)
		setValue(replaceValue(offset, searchValue, itemValue.value))
		const nextCaretOffset = offset + itemValue.value.length + 1
		setCaretOffset(nextCaretOffset)
	}

	return (
		<>
			<form className="w-full relative" onSubmit={handleSubmit}>
				<Ariakit.Combobox
					store={combobox}
					autoSelect
					value={value}
					// We'll overwrite how the combobox popover is shown, so we disable
					// the default behaviors.
					showOnClick={false}
					showOnChange={false}
					showOnKeyPress={false}
					// To the combobox state, we'll only set the value after the trigger
					// character (the search value), so we disable the default behavior.
					setValueOnChange={false}
					className="min-h-[100px] bg-[var(--app-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-4 w-full"
					render={
						<textarea
							ref={ref}
							rows={5}
							placeholder="Type @ or $"
							// We need to re-calculate the position of the combobox popover
							// when the textarea contents are scrolled.
							onScroll={combobox.render}
							// Hide the combobox popover whenever the selection changes.
							onPointerDown={combobox.hide}
							onChange={onChange}
							onKeyDown={onKeyDown}
							name="prompt"
						/>
					}
					disabled={isPending}
				/>
				<Ariakit.ComboboxPopover
					store={combobox}
					hidden={!hasMatches}
					unmountOnHide
					fitViewport
					getAnchorRect={() => {
						const textarea = ref.current
						if (!textarea) return null
						return getAnchorRect(textarea)
					}}
					className="relative z-50 flex flex-col overflow-auto overscroll-contain min-w-[100px] max-w-[280px] rounded-md border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)]"
				>
					{matches.map((value) => (
						<Ariakit.ComboboxItem
							key={value}
							value={value}
							focusOnHover
							onClick={onItemClick(value)}
							className="flex items-center justify-between gap-3 py-2 px-3 bg-[var(--bg1)] hover:bg-[var(--primary1-hover)] focus-visible:bg-[var(--primary1-hover)] data-[active-item]:bg-[var(--primary1-hover)] cursor-pointer"
						>
							<span>{value}</span>
						</Ariakit.ComboboxItem>
					))}
				</Ariakit.ComboboxPopover>
				<button
					className="flex items-center justify-center rounded-md gap-2 h-6 w-6 bg-[rgba(31,103,210,0.12)] border border-[var(--old-blue)] text-[var(--old-blue)] absolute bottom-3 right-2"
					disabled={isPending}
				>
					<Icon name="arrow-up" height={16} width={16} />
					<span className="sr-only">Submit prompt</span>
				</button>
			</form>
		</>
	)
}

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

const PromptResponse = ({
	response,
	error,
	isPending
}: {
	response?: { answer: string }
	error?: string
	isPending: boolean
}) => {
	const animatedResponse = useProgressiveWords(response?.answer ?? '', 15)

	if (error) {
		return <p className="text-red-500">{error}</p>
	}

	return <p>{isPending ? 'Thinking...' : animatedResponse}</p>
}
