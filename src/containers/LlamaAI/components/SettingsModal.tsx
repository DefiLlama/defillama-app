import * as Ariakit from '@ariakit/react'
import { memo, useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import type { TelegramStatus } from '~/containers/LlamaAI/api/telegram'
import { IntegrationRow } from '~/containers/LlamaAI/components/IntegrationRow'
import {
	type EffortOption,
	type LlamaAISettings,
	type LlamaAISettingsActions,
	type ModelOption
} from '~/containers/LlamaAI/hooks/useLlamaAISettings'
import { useDarkModeManager, useLlamaAINotifyBannerDismissed } from '~/contexts/LocalStorage'
import { trackUmamiEvent } from '~/utils/analytics/umami'

const MAX_LENGTH = 500

type ModalStatus = 'closed' | 'open_clean' | 'open_dirty' | 'committing'

export type SettingsTabId = 'persona' | 'app' | 'capabilities' | 'integrations' | 'lab'
type TabId = SettingsTabId

function isEffortAvailableForModel(effort: string, model: string) {
	const isClaude = model === '' || model.startsWith('anthropic/')
	if (isClaude) return effort !== 'minimal'
	if (model.startsWith('openai/')) return effort !== 'max'
	return true
}

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
	availableEfforts?: EffortOption[]
	telegramStatus?: TelegramStatus | null
	isSettingsLoading?: boolean
	initialState?: { tab?: TabId; tgloginToken?: string | null } | null
	onInitialStateConsumed?: () => void
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
	availableModels,
	availableEfforts,
	telegramStatus,
	isSettingsLoading,
	initialState,
	onInitialStateConsumed
}: SettingsModalProps) {
	const isOpen = Ariakit.useStoreState(dialogStore, 'open')
	const [isDark] = useDarkModeManager()
	const [, markNotifBannerDismissed] = useLlamaAINotifyBannerDismissed()
	const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('unsupported')
	const [isRequestingNotif, setIsRequestingNotif] = useState(false)
	const [activeTab, setActiveTab] = useState<TabId>('persona')
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

	useEffect(() => {
		if (!isOpen) return
		if (initialState?.tab) setActiveTab(initialState.tab)
		if (initialState && !initialState.tgloginToken && onInitialStateConsumed) onInitialStateConsumed()
	}, [isOpen, initialState, onInitialStateConsumed])

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

	useEffect(() => {
		if (activeTab === 'lab' && !isDark) {
			setActiveTab('persona')
		}
	}, [activeTab, isDark])

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

	const handleSoundToggle = useCallback(() => {
		trackUmamiEvent('llamaai-sound-notifications-toggle')
		void actions.setEnableSoundNotifications(!settings.enableSoundNotifications)
	}, [actions, settings.enableSoundNotifications])

	const handleEnterToSendToggle = useCallback(() => {
		trackUmamiEvent('llamaai-enter-to-send-toggle')
		void actions.setEnterToSend(!settings.enterToSend)
	}, [actions, settings.enterToSend])

	const [spendCapDraft, setSpendCapDraft] = useState<string>(settings.spendCapPerMessage.toFixed(2))
	const lastCommittedSpendCapRef = useRef<number>(settings.spendCapPerMessage)

	useEffect(() => {
		if (settings.spendCapPerMessage !== lastCommittedSpendCapRef.current) {
			lastCommittedSpendCapRef.current = settings.spendCapPerMessage
			setSpendCapDraft(settings.spendCapPerMessage.toFixed(2))
		}
	}, [settings.spendCapPerMessage])

	const commitSpendCap = useCallback(
		(raw: string) => {
			const parsed = Number(raw)
			if (!Number.isFinite(parsed) || parsed < 0) {
				setSpendCapDraft(lastCommittedSpendCapRef.current.toFixed(2))
				return
			}
			setSpendCapDraft(parsed.toFixed(2))
			if (parsed === lastCommittedSpendCapRef.current) return
			lastCommittedSpendCapRef.current = parsed
			trackUmamiEvent('llamaai-spend-cap-change')
			void actions.setSpendCapPerMessage(parsed)
		},
		[actions]
	)

	const handleSpendCapChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setSpendCapDraft(e.target.value)
	}, [])

	const handleSpendCapBlur = useCallback(
		(e: React.FocusEvent<HTMLInputElement>) => {
			commitSpendCap(e.target.value)
		},
		[commitSpendCap]
	)

	const handleSpendCapKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === 'Enter') {
				e.preventDefault()
				commitSpendCap((e.target as HTMLInputElement).value)
				;(e.target as HTMLInputElement).blur()
			}
		},
		[commitSpendCap]
	)

	useEffect(() => {
		if (!isOpen) return
		if (typeof window === 'undefined' || typeof Notification === 'undefined') {
			setNotifPermission('unsupported')
			return
		}
		setNotifPermission(Notification.permission)
	}, [isOpen])

	const handleNotifToggle = useCallback(() => {
		if (notifPermission !== 'default' || isRequestingNotif) return
		trackUmamiEvent('llamaai-notify-settings-enable')
		setIsRequestingNotif(true)
		Notification.requestPermission()
			.then((next) => {
				setNotifPermission(next)
				if (next !== 'granted') markNotifBannerDismissed()
			})
			.catch(() => markNotifBannerDismissed())
			.finally(() => setIsRequestingNotif(false))
	}, [notifPermission, isRequestingNotif, markNotifBannerDismissed])

	const handleModelChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			const nextModel = e.target.value
			void actions.setModel(nextModel)
			if (settings.effort && !isEffortAvailableForModel(settings.effort, nextModel)) {
				void actions.setEffort('')
			}
		},
		[actions, settings.effort]
	)

	const handleEffortChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			const nextEffort = e.target.value
			if (nextEffort && !isEffortAvailableForModel(nextEffort, settings.model)) return
			void actions.setEffort(nextEffort)
		},
		[actions, settings.model]
	)

	const showClear = modalState.status === 'open_dirty' || settings.customInstructions.trim().length > 0
	const notifSupported = notifPermission !== 'unsupported'

	const tabs: Array<{
		id: TabId
		label: string
		icon: 'pencil' | 'gear-settings' | 'sparkles' | 'flame' | 'link'
	}> = [
		{ id: 'persona', label: 'Persona', icon: 'pencil' },
		{ id: 'app', label: 'App', icon: 'gear-settings' },
		{ id: 'capabilities', label: 'Capabilities', icon: 'sparkles' },
		{ id: 'integrations', label: 'Integrations', icon: 'link' }
	]
	if (isDark) tabs.push({ id: 'lab', label: 'Lab', icon: 'flame' })

	return (
		<Ariakit.DialogProvider store={dialogStore}>
			<Ariakit.Dialog
				className="dialog max-h-[88vh] w-full max-w-[720px] gap-0 overflow-hidden rounded-2xl border border-black/5 bg-white p-0 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] dark:border-white/[0.06] dark:bg-[#17181C] dark:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]"
				backdrop={<div className="backdrop fixed inset-0 bg-black/60 backdrop-blur-md" />}
				portal
				unmountOnHide
			>
				<header className="relative overflow-hidden border-b border-black/[0.06] dark:border-white/[0.05]">
					<div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#1853A8]/[0.05] via-transparent to-transparent dark:from-[#4B86DB]/[0.07]" />
					<div className="relative flex items-center justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5">
						<div className="flex items-center gap-3">
							<div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#1853A8]/15 to-[#1853A8]/5 ring-1 ring-[#1853A8]/15 ring-inset dark:from-[#4B86DB]/20 dark:to-[#4B86DB]/5 dark:ring-[#4B86DB]/20">
								<Icon name="settings" className="h-[18px] w-[18px] text-[#1853A8] dark:text-[#4B86DB]" />
							</div>
							<div className="flex flex-col leading-tight">
								<h2 className="m-0 text-[15px] font-semibold tracking-tight text-black dark:text-white">Settings</h2>
								<p className="m-0 mt-0.5 text-[11px] text-[#777] dark:text-[#919296]">Tune how LlamaAI works for you</p>
							</div>
						</div>
						<Ariakit.DialogDismiss className="-mr-1.5 rounded-lg p-2 text-[#666] transition-colors hover:bg-black/[0.05] hover:text-black dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-white">
							<Icon name="x" className="h-4 w-4" />
						</Ariakit.DialogDismiss>
					</div>
				</header>

				<div className="flex flex-col sm:min-h-[480px] sm:flex-row">
					<nav
						aria-label="Settings sections"
						className="flex shrink-0 gap-1 overflow-x-auto border-b border-black/[0.06] px-2 py-2 sm:w-[180px] sm:flex-col sm:gap-0.5 sm:overflow-visible sm:border-r sm:border-b-0 sm:bg-black/[0.015] sm:p-3 dark:border-white/[0.05] dark:sm:bg-white/[0.012]"
					>
						{tabs.map((tab) => {
							const isActive = activeTab === tab.id
							return (
								<button
									key={tab.id}
									type="button"
									onClick={() => setActiveTab(tab.id)}
									className={`group relative flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors ${
										isActive
											? 'bg-white text-[#1853A8] shadow-[0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.06] dark:bg-white/[0.06] dark:text-[#4B86DB] dark:shadow-none dark:ring-white/[0.06]'
											: 'text-[#666] hover:bg-black/[0.03] hover:text-black dark:text-[#a0a0a5] dark:hover:bg-white/[0.03] dark:hover:text-white'
									}`}
								>
									<Icon
										name={tab.icon}
										className={`h-[14px] w-[14px] shrink-0 ${
											isActive ? 'text-[#1853A8] dark:text-[#4B86DB]' : 'text-[#999] dark:text-[#777]'
										}`}
									/>
									<span>{tab.label}</span>
								</button>
							)
						})}
					</nav>

					<div className="thin-scrollbar max-h-[calc(88vh-130px)] flex-1 overflow-y-auto sm:max-h-[calc(88vh-81px)]">
						<div className="px-5 py-5 sm:px-6 sm:py-6">
							{activeTab === 'persona' && (
								<div className="space-y-6">
									<div>
										<SectionHeading
											title="Custom Instructions"
											subtitle="Tell LlamaAI how to respond. Applied to every conversation."
										/>
										<div className="mt-3 space-y-2">
											<div className="relative">
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
													className="w-full resize-none rounded-xl border border-black/[0.08] bg-black/[0.015] p-3.5 text-sm text-[#1a1a1a] placeholder-[#aaa] transition-all outline-none focus:border-[#1853A8]/40 focus:bg-white focus:ring-4 focus:ring-[#1853A8]/[0.08] dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-white dark:placeholder-[#555] dark:focus:border-[#4B86DB]/40 dark:focus:bg-white/[0.04] dark:focus:ring-[#4B86DB]/[0.1]"
													rows={5}
												/>
												{showClear ? (
													<button
														type="button"
														onClick={handleClear}
														className="absolute top-2.5 right-2.5 rounded-md px-2 py-1 text-[10px] font-medium text-[#999] transition-colors hover:bg-red-500/10 hover:text-red-500"
													>
														Clear
													</button>
												) : null}
											</div>
											<div className="flex items-center justify-between font-mono text-[10.5px] text-[#999] dark:text-[#666]">
												<span>
													{charCount}/{MAX_LENGTH}
												</span>
												<span className="hidden sm:inline">⌘↵ to save & close</span>
											</div>
										</div>
									</div>

									<SettingsCard>
										<ToggleRow
											label="Remember preferences"
											description="Let LlamaAI remember your preferences across conversations for personalized responses."
											checked={settings.enableMemory}
											onClick={handleMemoryToggle}
										/>
									</SettingsCard>
								</div>
							)}

							{activeTab === 'app' && (
								<div className="space-y-5">
									<SectionHeading title="Interface" subtitle="How LlamaAI interacts with you in this browser." />
									<SettingsCard>
										<ToggleRow
											label="Completion sound"
											description="Play a short chime when LlamaAI finishes responding in a background tab."
											checked={settings.enableSoundNotifications}
											onClick={handleSoundToggle}
										/>
										<RowDivider />
										<ToggleRow
											label="Enter to send"
											description={
												settings.enterToSend
													? 'Press Enter to send and Shift+Enter for a new line.'
													: 'Press Enter for a new line and Shift+Enter to send.'
											}
											checked={settings.enterToSend}
											onClick={handleEnterToSendToggle}
										/>
										{notifSupported ? (
											<>
												<RowDivider />
												<ToggleRow
													label="Browser notifications"
													description={
														notifPermission === 'granted'
															? 'Enabled. Turn off in your browser site settings.'
															: notifPermission === 'denied'
																? 'Blocked. Re-enable in your browser site settings.'
																: 'Get alerted when LlamaAI finishes responding while the tab is in the background.'
													}
													checked={notifPermission === 'granted'}
													onClick={handleNotifToggle}
													interactive={notifPermission === 'default' && !isRequestingNotif}
												/>
											</>
										) : null}
									</SettingsCard>
								</div>
							)}

							{activeTab === 'capabilities' && (
								<div className="space-y-6">
									<div>
										<SectionHeading title="Premium tools" subtitle="Paid data sources for deeper research." />
										<div className="mt-3 space-y-3">
											<SettingsCard>
												<ToggleRow
													label="Enable premium tools"
													description="X/Twitter data, people search, and smart-money analytics. Uses your external data balance."
													checked={settings.enablePremiumTools}
													onClick={handlePremiumToolsToggle}
												/>
											</SettingsCard>
											{settings.enablePremiumTools ? (
												<div className="rounded-xl border border-black/[0.06] bg-black/[0.015] p-4 dark:border-white/[0.06] dark:bg-white/[0.015]">
													<label
														htmlFor="llamaai-spend-cap"
														className="block text-[13px] font-medium text-[#1a1a1a] dark:text-white"
													>
														Spend cap per message
													</label>
													<p className="mt-1 text-xs text-[#777] dark:text-[#919296]">
														Max external-data spend per message in USD. Each new message gets a fresh budget. Default
														$0.50.
													</p>
													<div className="mt-3 flex items-center gap-1 rounded-lg border border-black/[0.08] bg-white px-3 py-2 transition-colors focus-within:border-[#1853A8]/40 focus-within:ring-4 focus-within:ring-[#1853A8]/[0.08] dark:border-white/[0.08] dark:bg-[#1a1b1c] dark:focus-within:border-[#4B86DB]/40 dark:focus-within:ring-[#4B86DB]/[0.1]">
														<span className="font-mono text-sm text-[#999] dark:text-[#666]">$</span>
														<input
															id="llamaai-spend-cap"
															type="number"
															inputMode="decimal"
															min={0}
															step={0.05}
															value={spendCapDraft}
															onChange={handleSpendCapChange}
															onBlur={handleSpendCapBlur}
															onKeyDown={handleSpendCapKeyDown}
															className="w-full bg-transparent font-mono text-sm text-[#1a1a1a] outline-none dark:text-white"
														/>
													</div>
												</div>
											) : null}
										</div>
									</div>

									{availableModels && availableModels.length > 0 ? (
										<div>
											<SectionHeading title="Model" subtitle="Override the AI model that powers your responses." />
											<div className="mt-3 space-y-3 rounded-xl border border-black/[0.06] bg-black/[0.015] p-4 dark:border-white/[0.06] dark:bg-white/[0.015]">
												<SelectField
													id="llamaai-model-select"
													label="Model"
													value={settings.model}
													onChange={handleModelChange}
												>
													<option value="">Default (Sonnet 4.6)</option>
													{availableModels.map((m) => (
														<option key={m.id} value={m.id}>
															{m.label}
														</option>
													))}
												</SelectField>
												{availableEfforts && availableEfforts.length > 0 ? (
													<SelectField
														id="llamaai-effort-select"
														label="Reasoning effort"
														value={settings.effort}
														onChange={handleEffortChange}
													>
														<option value="">Default</option>
														{availableEfforts.map((effort) => (
															<option
																key={effort.id}
																value={effort.id}
																disabled={!isEffortAvailableForModel(effort.id, settings.model)}
															>
																{effort.label}
															</option>
														))}
													</SelectField>
												) : null}
											</div>
										</div>
									) : null}
								</div>
							)}

							{activeTab === 'integrations' && (
								<div className="space-y-5">
									<SectionHeading
										title="Integrations"
										subtitle="Connect external accounts to chat and receive alerts."
									/>
									{isSettingsLoading ? (
										<div className="rounded-xl border border-black/[0.06] bg-black/[0.015] p-4 dark:border-white/[0.06] dark:bg-white/[0.015]">
											<div className="flex items-center justify-between gap-3">
												<div className="min-w-0 flex-1">
													<div className="h-4 w-24 animate-pulse rounded bg-black/[0.08] dark:bg-white/[0.08]" />
													<div className="mt-2 h-3 w-full max-w-[360px] animate-pulse rounded bg-black/[0.06] dark:bg-white/[0.06]" />
												</div>
												<div className="h-8 w-20 shrink-0 animate-pulse rounded-lg bg-black/[0.08] dark:bg-white/[0.08]" />
											</div>
										</div>
									) : (
										<IntegrationRow
											kind="telegram"
											title="Telegram"
											description="Chat with LlamaAI and receive alerts in your Telegram DMs."
											initialStatus={telegramStatus}
											initialTgloginToken={initialState?.tgloginToken ?? null}
											onInitialStateConsumed={onInitialStateConsumed}
										/>
									)}
								</div>
							)}

							{activeTab === 'lab' && isDark ? (
								<div className="space-y-5">
									<SectionHeading title="Experimental" subtitle="Bleeding-edge modes. Things may get weird." />
									<button
										type="button"
										role="switch"
										aria-checked={settings.hackerMode}
										aria-label="Hacker Mode"
										onClick={handleHackerToggle}
										className={`group relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-xl p-4 text-left transition-all ${
											settings.hackerMode
												? 'bg-[#0a0a0a] shadow-[0_0_40px_rgba(0,255,65,0.08)] ring-1 ring-[#00ff41]/30'
												: 'bg-white/[0.02] ring-1 ring-white/[0.08] hover:ring-white/[0.16]'
										}`}
									>
										{settings.hackerMode ? (
											<div className="pointer-events-none absolute inset-0 opacity-40">
												<div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,65,0.18)_1px,transparent_1px)] bg-[length:14px_14px]" />
											</div>
										) : null}
										<div className="relative flex items-center gap-3">
											<img src="/assets/llamaai/hackerllama.webp" alt="" className="h-11 w-11 rounded-lg shadow-sm" />
											<div className="flex flex-col gap-0.5">
												<p
													className={`m-0 text-sm font-medium ${
														settings.hackerMode
															? 'font-mono text-[#00ff41] drop-shadow-[0_0_6px_rgba(0,255,65,0.5)]'
															: 'text-white'
													}`}
												>
													{settings.hackerMode ? '> hacker_mode --active' : 'Hacker Mode'}
												</p>
												<p className="m-0 text-xs text-[#919296]">
													Watch the llama hack through your questions in green.
												</p>
											</div>
										</div>
										<div
											className={`relative ml-3 h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${
												settings.hackerMode ? 'bg-[#00ff41] shadow-[0_0_10px_rgba(0,255,65,0.45)]' : 'bg-white/15'
											}`}
										>
											<div
												className={`absolute top-[3px] h-4 w-4 rounded-full shadow transition-transform duration-200 ${
													settings.hackerMode ? 'translate-x-[19px] bg-[#0d0d0d]' : 'translate-x-[3px] bg-white'
												}`}
											/>
										</div>
									</button>
								</div>
							) : null}
						</div>
					</div>
				</div>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
})

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
	return (
		<div className="space-y-1">
			<h3 className="m-0 text-[13px] font-semibold tracking-tight text-[#1a1a1a] dark:text-white">{title}</h3>
			{subtitle ? <p className="m-0 text-xs text-[#777] dark:text-[#919296]">{subtitle}</p> : null}
		</div>
	)
}

function SettingsCard({ children }: { children: React.ReactNode }) {
	return (
		<div className="overflow-hidden rounded-xl border border-black/[0.06] bg-black/[0.015] dark:border-white/[0.06] dark:bg-white/[0.015]">
			{children}
		</div>
	)
}

function RowDivider() {
	return <div className="mx-4 h-px bg-black/[0.05] dark:bg-white/[0.05]" />
}

function ToggleRow({
	label,
	description,
	checked,
	onClick,
	interactive = true
}: {
	label: string
	description: string
	checked: boolean
	onClick: () => void
	interactive?: boolean
}) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={label}
			onClick={onClick}
			disabled={!interactive}
			className="group flex w-full items-start justify-between gap-4 px-4 py-3.5 text-left transition-colors hover:bg-black/[0.02] disabled:cursor-default disabled:hover:bg-transparent dark:hover:bg-white/[0.02]"
		>
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<p className="m-0 text-[13.5px] font-medium text-[#1a1a1a] dark:text-white">{label}</p>
				<p className="m-0 text-xs leading-relaxed text-[#777] dark:text-[#919296]">{description}</p>
			</div>
			<div
				className={`relative mt-0.5 h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${
					checked ? 'bg-[#1853A8] dark:bg-[#4B86DB]' : 'bg-black/15 dark:bg-white/15'
				}`}
			>
				<div
					className={`absolute top-[3px] h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
						checked ? 'translate-x-[19px]' : 'translate-x-[3px]'
					}`}
				/>
			</div>
		</button>
	)
}

function SelectField({
	id,
	label,
	value,
	onChange,
	children
}: {
	id: string
	label: string
	value: string
	onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
	children: React.ReactNode
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<label htmlFor={id} className="text-[12px] font-medium text-[#666] dark:text-[#a0a0a5]">
				{label}
			</label>
			<div className="relative">
				<select
					id={id}
					value={value}
					onChange={onChange}
					className="w-full appearance-none rounded-lg border border-black/[0.08] bg-white px-3 py-2 pr-9 text-sm text-[#1a1a1a] transition-colors outline-none focus:border-[#1853A8]/40 focus:ring-4 focus:ring-[#1853A8]/[0.08] dark:border-white/[0.08] dark:bg-[#1a1b1c] dark:text-white dark:focus:border-[#4B86DB]/40 dark:focus:ring-[#4B86DB]/[0.1]"
				>
					{children}
				</select>
				<Icon
					name="chevron-down"
					className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[#999] dark:text-[#666]"
				/>
			</div>
		</div>
	)
}
