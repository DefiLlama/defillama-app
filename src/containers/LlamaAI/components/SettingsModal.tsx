import * as Ariakit from '@ariakit/react'
import { memo, useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import {
	type LlamaAISettings,
	type LlamaAISettingsActions,
	type ModelOption
} from '~/containers/LlamaAI/hooks/useLlamaAISettings'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { trackUmamiEvent } from '~/utils/analytics/umami'

const MAX_LENGTH = 500

type ModalStatus = 'closed' | 'open_clean' | 'open_dirty' | 'committing'

type ModalAction =
	| { type: 'OPEN' }
	| { type: 'MARK_DIRTY' }
	| { type: 'MARK_CLEAN' }
	| { type: 'COMMIT_START' }
	| { type: 'COMMIT_DONE' }
	| { type: 'CLOSE' }

interface ModalState {
	status: ModalStatus
}

interface SettingsModalProps {
	dialogStore: Ariakit.DialogStore
	settings: LlamaAISettings
	actions: LlamaAISettingsActions
	availableModels?: ModelOption[]
}

function modalReducer(state: ModalState, action: ModalAction): ModalState {
	switch (action.type) {
		case 'OPEN':
			return { status: 'open_clean' }
		case 'MARK_DIRTY':
			return state.status === 'open_dirty' ? state : { status: 'open_dirty' }
		case 'MARK_CLEAN':
			return state.status === 'open_clean' ? state : { status: 'open_clean' }
		case 'COMMIT_START':
			return { status: 'committing' }
		case 'COMMIT_DONE':
			return { status: 'open_clean' }
		case 'CLOSE':
			return { status: 'closed' }
	}
}

export const SettingsModal = memo(function SettingsModal({
	dialogStore,
	settings,
	actions,
	availableModels
}: SettingsModalProps) {
	const isOpen = Ariakit.useStoreState(dialogStore, 'open')
	const [isDark] = useDarkModeManager()
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const baselineRef = useRef(settings.customInstructions.trim())
	const draftValueRef = useRef(settings.customInstructions)
	const latestCustomInstructionsRef = useRef(settings.customInstructions)
	const wasOpenRef = useRef(false)
	const [modalState, dispatch] = useReducer(modalReducer, { status: 'closed' })
	const [charCount, setCharCount] = useState(settings.customInstructions.length)

	useEffect(() => {
		latestCustomInstructionsRef.current = settings.customInstructions
		if (!isOpen || modalState.status === 'open_dirty') return

		if (textareaRef.current) {
			textareaRef.current.value = settings.customInstructions
		}
		draftValueRef.current = settings.customInstructions
		baselineRef.current = settings.customInstructions.trim()
		queueMicrotask(() => {
			setCharCount(settings.customInstructions.length)
			dispatch({ type: 'MARK_CLEAN' })
		})
	}, [isOpen, modalState.status, settings.customInstructions])

	const syncDirtyState = useCallback(() => {
		draftValueRef.current = textareaRef.current?.value ?? draftValueRef.current
		setCharCount(draftValueRef.current.length)
		const nextValue = draftValueRef.current.trim()
		dispatch({ type: nextValue === baselineRef.current ? 'MARK_CLEAN' : 'MARK_DIRTY' })
	}, [])

	const commitDraft = useCallback(
		async ({ closeAfterCommit = false }: { closeAfterCommit?: boolean } = {}) => {
			draftValueRef.current = textareaRef.current?.value ?? draftValueRef.current
			const nextValue = draftValueRef.current.trim()
			if (nextValue === baselineRef.current) {
				if (closeAfterCommit) {
					dispatch({ type: 'CLOSE' })
				}
				return
			}

			dispatch({ type: 'COMMIT_START' })
			trackUmamiEvent('llamaai-custom-instructions-save')
			await actions.setCustomInstructions(nextValue)
			baselineRef.current = nextValue
			if (closeAfterCommit) {
				dispatch({ type: 'CLOSE' })
			} else {
				dispatch({ type: 'COMMIT_DONE' })
			}
		},
		[actions]
	)

	useEffect(() => {
		if (isOpen) {
			wasOpenRef.current = true
			trackUmamiEvent('llamaai-settings-open')
			let cancelled = false

			queueMicrotask(() => {
				if (cancelled) return
				const nextValue = latestCustomInstructionsRef.current
				if (textareaRef.current) {
					textareaRef.current.value = nextValue
				}
				draftValueRef.current = nextValue
				baselineRef.current = nextValue.trim()
				setCharCount(nextValue.length)
				dispatch({ type: 'OPEN' })
			})

			return () => {
				cancelled = true
			}
		}

		if (!wasOpenRef.current) return
		wasOpenRef.current = false
		void commitDraft({ closeAfterCommit: true })
	}, [commitDraft, isOpen])

	const handleClear = useCallback(() => {
		if (textareaRef.current) {
			textareaRef.current.value = ''
		}
		draftValueRef.current = ''
		syncDirtyState()
		void commitDraft()
	}, [commitDraft, syncDirtyState])

	const handleMemoryToggle = useCallback(() => {
		trackUmamiEvent('llamaai-memory-toggle')
		void actions.setEnableMemory(!settings.enableMemory)
	}, [actions, settings.enableMemory])

	const handlePremiumToolsToggle = useCallback(() => {
		trackUmamiEvent('llamaai-premium-tools-toggle')
		void actions.setEnablePremiumTools(!settings.enablePremiumTools)
	}, [actions, settings.enablePremiumTools])

	const handleHackerToggle = useCallback(() => {
		trackUmamiEvent('llamaai-hacker-mode-toggle')
		void actions.setHackerMode(!settings.hackerMode)
	}, [actions, settings.hackerMode])

	const handleModelChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			void actions.setModel(e.target.value)
		},
		[actions]
	)

	const showClear = modalState.status === 'open_dirty' || settings.customInstructions.trim().length > 0

	return (
		<Ariakit.DialogProvider store={dialogStore}>
			<Ariakit.Dialog
				className="dialog max-h-[85vh] max-w-lg gap-0 overflow-hidden rounded-2xl border border-[#E6E6E6] bg-[#FFFFFF] p-0 shadow-xl dark:border-[#39393E] dark:bg-[#222429]"
				backdrop={<div className="backdrop fixed inset-0 bg-black/60 backdrop-blur-sm" />}
				portal
				unmountOnHide
			>
				<header className="flex items-center justify-between border-b border-[#E6E6E6] px-5 py-4 dark:border-[#39393E]">
					<div className="flex items-center gap-3">
						<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-(--old-blue)/10 dark:bg-(--old-blue)/15">
							<Icon name="settings" className="h-5 w-5 text-[#1853A8] dark:text-[#4B86DB]" />
						</div>
						<h2 className="text-lg font-semibold text-black dark:text-white">Settings</h2>
					</div>
					<Ariakit.DialogDismiss className="rounded-full p-1.5 text-[#666] transition-colors hover:bg-[#f7f7f7] hover:text-black dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-white">
						<Icon name="x" className="h-5 w-5" />
					</Ariakit.DialogDismiss>
				</header>

				<div className="thin-scrollbar max-h-[calc(85vh-73px)] overflow-y-auto">
					<section className="flex flex-col gap-1.5 px-5 py-4">
						<div className="flex items-center justify-between">
							<label
								htmlFor="llamaai-custom-instructions"
								className="text-sm font-medium text-[#1a1a1a] dark:text-white"
							>
								Custom Instructions
							</label>
							{showClear ? (
								<button
									type="button"
									onClick={handleClear}
									className="text-xs text-[#999] transition-colors hover:text-red-500"
								>
									Clear
								</button>
							) : null}
						</div>
						<p className="text-xs text-[#777] dark:text-[#919296]">
							Tell LlamaAI how to respond. These apply to every conversation.
						</p>
						<textarea
							ref={textareaRef}
							id="llamaai-custom-instructions"
							defaultValue={settings.customInstructions}
							maxLength={MAX_LENGTH}
							onBlur={() => void commitDraft()}
							onInput={syncDirtyState}
							onKeyDown={(e) => {
								if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
									e.preventDefault()
									void commitDraft().then(() => dialogStore.hide())
								}
							}}
							placeholder="e.g., Be concise and lead with numbers. Always include % changes."
							className="mt-1 w-full resize-none rounded-lg border border-[#e6e6e6] bg-[#fafafa] p-3 text-sm text-[#1a1a1a] placeholder-[#aaa] transition-colors outline-none focus:border-[#1853A8] dark:border-[#39393E] dark:bg-[#1a1b1c] dark:text-white dark:placeholder-[#555] dark:focus:border-[#4B86DB]"
							rows={4}
						/>
						<div className="flex items-center justify-between text-[11px] text-[#999] dark:text-[#666]">
							<p className="m-0">
								{charCount}/{MAX_LENGTH} characters
							</p>
							<p className="m-0 hidden sm:inline">⌘+Enter to save &amp; close</p>
						</div>
					</section>

					<section className="border-t border-[#E6E6E6] px-5 py-4 dark:border-[#39393E]">
						<button
							type="button"
							role="switch"
							aria-checked={settings.enableMemory}
							aria-label="Remember my preferences"
							onClick={handleMemoryToggle}
							className="flex w-full items-center justify-between"
						>
							<div className="flex flex-col gap-0.5 text-left">
								<p className="m-0 text-sm font-medium text-[#1a1a1a] dark:text-white">Remember my preferences</p>
								<p className="m-0 text-xs text-[#777] dark:text-[#919296]">
									Let LlamaAI remember your preferences across conversations for personalized responses.
								</p>
							</div>
							<div
								className={`relative ml-3 h-5 w-9 shrink-0 rounded-full transition-colors ${
									settings.enableMemory ? 'bg-[#1853A8] dark:bg-[#4B86DB]' : 'bg-[#d1d1d1] dark:bg-[#555]'
								}`}
							>
								<div
									className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
										settings.enableMemory ? 'translate-x-4' : 'translate-x-0.5'
									}`}
								/>
							</div>
						</button>
					</section>

					<section className="border-t border-[#E6E6E6] px-5 py-4 dark:border-[#39393E]">
						<button
							type="button"
							role="switch"
							aria-checked={settings.enablePremiumTools}
							aria-label="Premium data tools"
							onClick={handlePremiumToolsToggle}
							className="flex w-full items-center justify-between"
						>
							<div className="flex flex-col gap-0.5 text-left">
								<p className="m-0 text-sm font-medium text-[#1a1a1a] dark:text-white">Premium data tools</p>
								<p className="m-0 text-xs text-[#777] dark:text-[#919296]">
									Enable paid tools like X/Twitter data, people search, and smart money analytics. Uses your external
									data balance
								</p>
							</div>
							<div
								className={`relative ml-3 h-5 w-9 shrink-0 rounded-full transition-colors ${
									settings.enablePremiumTools ? 'bg-[#1853A8] dark:bg-[#4B86DB]' : 'bg-[#d1d1d1] dark:bg-[#555]'
								}`}
							>
								<div
									className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
										settings.enablePremiumTools ? 'translate-x-4' : 'translate-x-0.5'
									}`}
								/>
							</div>
						</button>
					</section>

					{isDark ? (
						<section className="border-t border-[#E6E6E6] px-5 py-4 dark:border-[#39393E]">
							<button
								type="button"
								role="switch"
								aria-checked={settings.hackerMode}
								aria-label="Hacker Mode"
								onClick={handleHackerToggle}
								className="flex w-full items-center justify-between"
							>
								<div className="flex items-center gap-3 text-left">
									<img src="/assets/llamaai/hackerllama.webp" alt="Hacker Llama" className="h-9 w-9 rounded-lg" />
									<div className="flex flex-col gap-0.5">
										<p
											className={`m-0 text-sm font-medium ${
												settings.hackerMode
													? 'font-mono text-[#00ff41] drop-shadow-[0_0_6px_rgba(0,255,65,0.5)]'
													: 'text-[#1a1a1a] dark:text-white'
											}`}
										>
											{settings.hackerMode ? '> hacker_mode --active' : 'Hacker Mode'}
										</p>
										<p className="m-0 text-xs text-[#777] dark:text-[#919296]">
											Watch the llama hack through your questions in green.
										</p>
									</div>
								</div>
								<div
									className={`relative ml-3 h-5 w-9 shrink-0 rounded-full transition-colors ${
										settings.hackerMode
											? 'bg-[#00ff41] shadow-[0_0_8px_rgba(0,255,65,0.4)]'
											: 'bg-[#d1d1d1] dark:bg-[#555]'
									}`}
								>
									<div
										className={`absolute top-0.5 h-4 w-4 rounded-full shadow transition-transform ${
											settings.hackerMode ? 'translate-x-4 bg-[#0d0d0d]' : 'translate-x-0.5 bg-white'
										}`}
									/>
								</div>
							</button>
						</section>
					) : null}

					{availableModels && availableModels.length > 0 ? (
						<section className="border-t border-[#E6E6E6] px-5 py-4 dark:border-[#39393E]">
							<div className="flex flex-col gap-1.5">
								<label htmlFor="llamaai-model-select" className="text-sm font-medium text-[#1a1a1a] dark:text-white">
									Model
								</label>
								<p className="text-xs text-[#777] dark:text-[#919296]">Override the AI model used for responses.</p>
								<select
									id="llamaai-model-select"
									value={settings.model}
									onChange={handleModelChange}
									className="mt-1 w-full rounded-lg border border-[#e6e6e6] bg-[#fafafa] px-3 py-2 text-sm text-[#1a1a1a] transition-colors outline-none focus:border-[#1853A8] dark:border-[#39393E] dark:bg-[#1a1b1c] dark:text-white dark:focus:border-[#4B86DB]"
								>
									<option value="">Default (Sonnet 4.6)</option>
									{availableModels.map((m) => (
										<option key={m.id} value={m.id}>
											{m.label}
										</option>
									))}
								</select>
							</div>
						</section>
					) : null}
				</div>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
})
