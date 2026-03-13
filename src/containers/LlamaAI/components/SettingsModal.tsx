import * as Ariakit from '@ariakit/react'
import { memo, useCallback, useEffect, useState } from 'react'
import { Icon } from '~/components/Icon'
import { MCP_SERVER } from '~/constants'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { trackUmamiEvent } from '~/utils/analytics/umami'

const STORAGE_KEY = 'llamaai-custom-instructions'
const MEMORY_STORAGE_KEY = 'llamaai-enable-memory'
const HACKER_MODE_KEY = 'llamaai-hacker-mode'
const MAX_LENGTH = 500

interface SettingsModalProps {
	dialogStore: Ariakit.DialogStore
	customInstructions: string
	onCustomInstructionsChange: (value: string) => void
	enableMemory: boolean
	onEnableMemoryChange: (value: boolean) => void
	hackerMode: boolean
	onHackerModeChange: (value: boolean) => void
	fetchFn?: typeof fetch
}

async function saveSettingsToServer(fetchFn: typeof fetch, settings: Record<string, any>) {
	try {
		await fetchFn(`${MCP_SERVER}/user-settings`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ settings })
		})
	} catch {}
}

export const SettingsModal = memo(function SettingsModal({
	dialogStore,
	customInstructions,
	onCustomInstructionsChange,
	enableMemory,
	onEnableMemoryChange,
	hackerMode,
	onHackerModeChange,
	fetchFn
}: SettingsModalProps) {
	const isOpen = Ariakit.useStoreState(dialogStore, 'open')
	const [isDark] = useDarkModeManager()
	const [draft, setDraft] = useState(customInstructions)
	const [memoryDraft, setMemoryDraft] = useState(enableMemory)
	const [hackerDraft, setHackerDraft] = useState(hackerMode)

	useEffect(() => {
		if (!isOpen) return
		trackUmamiEvent('llamaai-settings-open')
		let cancelled = false

		queueMicrotask(() => {
			if (cancelled) return
			setDraft(customInstructions)
			setMemoryDraft(enableMemory)
			setHackerDraft(hackerMode)
		})

		return () => {
			cancelled = true
		}
	}, [isOpen, customInstructions, enableMemory, hackerMode])

	const save = useCallback(() => {
		const trimmed = draft.trim()
		if (trimmed === customInstructions.trim()) return
		trackUmamiEvent('llamaai-custom-instructions-save')
		onCustomInstructionsChange(trimmed)
		localStorage.setItem(STORAGE_KEY, trimmed)
		if (fetchFn) {
			void saveSettingsToServer(fetchFn, { customInstructions: trimmed })
		}
	}, [draft, customInstructions, onCustomInstructionsChange, fetchFn])

	useEffect(() => {
		if (!isOpen && draft !== customInstructions) save()
	}, [isOpen, draft, customInstructions, save])

	const handleClear = useCallback(() => {
		setDraft('')
		onCustomInstructionsChange('')
		localStorage.removeItem(STORAGE_KEY)
		if (fetchFn) {
			void saveSettingsToServer(fetchFn, { customInstructions: '' })
		}
	}, [onCustomInstructionsChange, fetchFn])

	const handleMemoryToggle = useCallback(() => {
		const next = !memoryDraft
		trackUmamiEvent('llamaai-memory-toggle')
		setMemoryDraft(next)
		onEnableMemoryChange(next)
		localStorage.setItem(MEMORY_STORAGE_KEY, String(next))
		if (fetchFn) {
			void saveSettingsToServer(fetchFn, { enableMemory: next })
		}
	}, [memoryDraft, onEnableMemoryChange, fetchFn])

	const handleHackerToggle = useCallback(() => {
		const next = !hackerDraft
		trackUmamiEvent('llamaai-hacker-mode-toggle')
		setHackerDraft(next)
		onHackerModeChange(next)
		localStorage.setItem(HACKER_MODE_KEY, String(next))
		window.dispatchEvent(new Event('llamaai-hacker-mode-changed'))
		if (fetchFn) {
			void saveSettingsToServer(fetchFn, { hackerMode: next })
		}
	}, [hackerDraft, onHackerModeChange, fetchFn])

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
							{draft.trim().length > 0 ? (
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
							id="llamaai-custom-instructions"
							value={draft}
							onChange={(e) => setDraft(e.target.value.slice(0, MAX_LENGTH))}
							onBlur={save}
							onKeyDown={(e) => {
								if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
									save()
									dialogStore.hide()
								}
							}}
							placeholder="e.g., Be concise and lead with numbers. Always include % changes."
							className="mt-1 w-full resize-none rounded-lg border border-[#e6e6e6] bg-[#fafafa] p-3 text-sm text-[#1a1a1a] placeholder-[#aaa] transition-colors outline-none focus:border-[#1853A8] dark:border-[#39393E] dark:bg-[#1a1b1c] dark:text-white dark:placeholder-[#555] dark:focus:border-[#4B86DB]"
							rows={4}
						/>
						<div className="flex items-center justify-between text-[11px] text-[#999] dark:text-[#666]">
							<p className="m-0">
								{draft.length}/{MAX_LENGTH}
							</p>
							<p className="m-0 hidden sm:inline">⌘+Enter to save &amp; close</p>
						</div>
					</section>

					<section className="border-t border-[#E6E6E6] px-5 py-4 dark:border-[#39393E]">
						<button
							type="button"
							role="switch"
							aria-checked={memoryDraft}
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
									memoryDraft ? 'bg-[#1853A8] dark:bg-[#4B86DB]' : 'bg-[#d1d1d1] dark:bg-[#555]'
								}`}
							>
								<div
									className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
										memoryDraft ? 'translate-x-4' : 'translate-x-0.5'
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
								aria-checked={hackerDraft}
								aria-label="Hacker Mode"
								onClick={handleHackerToggle}
								className="flex w-full items-center justify-between"
							>
								<div className="flex items-center gap-3 text-left">
									<img src="/assets/llamaai/hackerllama.webp" alt="Hacker Llama" className="h-9 w-9 rounded-lg" />
									<div className="flex flex-col gap-0.5">
										<p
											className={`m-0 text-sm font-medium ${
												hackerDraft
													? 'font-mono text-[#00ff41] drop-shadow-[0_0_6px_rgba(0,255,65,0.5)]'
													: 'text-[#1a1a1a] dark:text-white'
											}`}
										>
											{hackerDraft ? '> hacker_mode --active' : 'Hacker Mode'}
										</p>
										<p className="m-0 text-xs text-[#777] dark:text-[#919296]">
											Watch the llama hack through your questions in green.
										</p>
									</div>
								</div>
								<div
									className={`relative ml-3 h-5 w-9 shrink-0 rounded-full transition-colors ${
										hackerDraft ? 'bg-[#00ff41] shadow-[0_0_8px_rgba(0,255,65,0.4)]' : 'bg-[#d1d1d1] dark:bg-[#555]'
									}`}
								>
									<div
										className={`absolute top-0.5 h-4 w-4 rounded-full shadow transition-transform ${
											hackerDraft ? 'translate-x-4 bg-[#0d0d0d]' : 'translate-x-0.5 bg-white'
										}`}
									/>
								</div>
							</button>
						</section>
					) : null}
				</div>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
})
