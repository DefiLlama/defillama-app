import Router from 'next/router'
import { useState, type MouseEvent as ReactMouseEvent } from 'react'
import { sanitizeUrl } from '~/containers/LlamaAI/utils/markdownHelpers'
import { trackUmamiEvent } from '~/utils/analytics/umami'

function getActionKey(action: { label: string; message: string }) {
	return `${action.label}:${action.message}`
}

function getIndexedActionKey(action: { label: string; message: string }, index: number) {
	return `${getActionKey(action)}-${index}`
}

function sanitizeExternalActionHref(href: string) {
	// Model-authored external actions must pass through the same URL sanitizer
	// as markdown links before they can open a new tab.
	const safeHref = sanitizeUrl(href)
	if (!safeHref) return null

	try {
		const parsed = new URL(safeHref)
		return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null
	} catch {
		return null
	}
}

function getActionHrefProps(href: string, label: string) {
	if (href.startsWith('http')) {
		const safeHref = sanitizeExternalActionHref(href)
		return {
			href: safeHref ?? '#',
			...(safeHref
				? {
						target: '_blank' as const,
						rel: 'noopener noreferrer'
					}
				: {}),
			onClick: (event: ReactMouseEvent<HTMLAnchorElement>) => {
				if (!safeHref) {
					event.preventDefault()
				}
				trackUmamiEvent('llamaai-action-link-click', { label })
			}
		}
	}

	return {
		href: `https://defillama.com${href}`,
		onClick: (event: ReactMouseEvent<HTMLAnchorElement>) => {
			trackUmamiEvent('llamaai-action-link-click', { label })
			event.preventDefault()
			void Router.push(href)
		}
	}
}

function extractActionUrl(message: string) {
	if (!message.startsWith('url:')) return null
	const href = message.slice(4).trim()
	return href.length > 0 ? href : null
}

function ActionLink({
	action,
	variant
}: {
	action: { label: string; message: string; compositeId: string }
	variant: 'decision' | 'suggestion'
}) {
	const href = extractActionUrl(action.message)

	if (!href) {
		return <span className="inline-flex items-center gap-1.5 text-inherit">{action.label}</span>
	}

	return (
		<a
			{...getActionHrefProps(href, action.label)}
			className={
				variant === 'decision'
					? 'inline-flex items-center gap-1.5 rounded-full border border-[#2172e5]/15 bg-[#2172e5]/3 px-4 py-2 text-sm font-medium text-[#2172e5] transition-all duration-150 hover:border-[#2172e5]/35 hover:bg-[#2172e5]/8 active:scale-[0.97] dark:border-[#4190f7]/15 dark:bg-[#4190f7]/3 dark:text-[#4190f7] dark:hover:border-[#4190f7]/35 dark:hover:bg-[#4190f7]/8'
					: 'inline-flex items-center gap-1.5 rounded-full border border-[#2172e5]/10 bg-[#2172e5]/4 px-3 py-1.5 text-xs font-medium text-[#2172e5]/55 transition-all duration-150 hover:border-[#2172e5]/20 hover:bg-[#2172e5]/8 hover:text-[#2172e5]/75 active:scale-[0.97] dark:border-[#4190f7]/10 dark:bg-[#4190f7]/5 dark:text-[#4190f7]/50 dark:hover:border-[#4190f7]/20 dark:hover:bg-[#4190f7]/10 dark:hover:text-[#4190f7]/75'
			}
		>
			{action.label}
			<svg
				width={variant === 'decision' ? '12' : '10'}
				height={variant === 'decision' ? '12' : '10'}
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				className={variant === 'decision' ? undefined : 'opacity-60'}
			>
				<path d="M7 17L17 7" />
				<path d="M7 7h10v10" />
			</svg>
		</a>
	)
}

export function ActionButtonGroup({
	actions,
	onActionClick,
	nextUserMessage
}: {
	actions: Array<{ label: string; message: string }>
	onActionClick?: (message: string) => void
	nextUserMessage?: string
}) {
	const isDecisionGroup = actions.some((action) => action.message.startsWith('confirm:'))
	const resolvedActions = actions.map((action, index) => {
		const resolvedAction = {
			label: action.label,
			message: action.message.startsWith('confirm:') ? action.message.slice(8) : action.message
		}
		return {
			...resolvedAction,
			compositeId: getIndexedActionKey(resolvedAction, index)
		}
	})
	const actionSignature = resolvedActions.map((action) => action.compositeId).join('|')
	const primaryActionKey = (resolvedActions.find((action) => !action.message.startsWith('url:')) || resolvedActions[0])
		?.compositeId
	// Scope optimistic clicked state to the rendered action set plus the next user
	// message so branch restores or regenerated suggestions do not inherit old clicks.
	const optimisticScope = `${actionSignature}:${nextUserMessage ?? ''}`
	const alreadyClicked = nextUserMessage
		? (resolvedActions.find((action) => !action.message.startsWith('url:') && action.message === nextUserMessage)
				?.compositeId ?? null)
		: null
	const [optimisticClickedIds, setOptimisticClickedIds] = useState<{ ids: Set<string>; scope: string } | null>(null)
	const clickedIds = new Set<string>()
	if (alreadyClicked) clickedIds.add(alreadyClicked)
	if (optimisticClickedIds?.scope === optimisticScope) {
		for (const id of optimisticClickedIds.ids) {
			clickedIds.add(id)
		}
	}

	const handleActionClick = (action: { label: string; message: string; compositeId: string }) => {
		if (!onActionClick) return
		trackUmamiEvent('llamaai-action-click', { label: action.label })
		setOptimisticClickedIds((current) => {
			const ids = current?.scope === optimisticScope ? new Set(current.ids) : new Set<string>()
			ids.add(action.compositeId)
			return { ids, scope: optimisticScope }
		})
		onActionClick(action.message)
	}

	if (isDecisionGroup) {
		return (
			<div className="flex flex-wrap items-center gap-2.5">
				{resolvedActions.map((action) => {
					const isUrl = action.message.startsWith('url:')
					const actionKey = action.compositeId
					const isPrimary = !isUrl && actionKey === primaryActionKey

					if (isUrl) {
						return <ActionLink key={actionKey} action={action} variant="decision" />
					}

					if (isPrimary) {
						return (
							<button
								key={actionKey}
								type="button"
								disabled={!onActionClick}
								onClick={() => handleActionClick(action)}
								className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-150 ${
									!clickedIds.has(action.compositeId)
										? onActionClick
											? 'bg-[#2172e5] text-white hover:bg-[#1b5fbd] active:scale-[0.97] dark:bg-[#4190f7] dark:hover:bg-[#3279de]'
											: 'bg-[#e6e6e6] text-[#999] dark:bg-[#333] dark:text-[#666]'
										: 'bg-[#2172e5] text-white dark:bg-[#4190f7]'
								}`}
							>
								{action.label}
							</button>
						)
					}

					return (
						<button
							key={actionKey}
							type="button"
							disabled={!onActionClick}
							onClick={() => handleActionClick(action)}
							className={`rounded-full border px-5 py-2.5 text-sm font-medium transition-all duration-150 ${
								!clickedIds.has(action.compositeId)
									? onActionClick
										? 'border-[#2172e5]/20 text-[#2172e5] hover:border-[#2172e5]/40 hover:bg-[#2172e5]/6 active:scale-[0.97] dark:border-[#4190f7]/20 dark:text-[#4190f7] dark:hover:border-[#4190f7]/40 dark:hover:bg-[#4190f7]/6'
										: 'border-[#e6e6e6] text-[#999] dark:border-[#333] dark:text-[#666]'
									: 'border-[#2172e5] bg-[#2172e5]/10 text-[#2172e5] dark:border-[#4190f7] dark:bg-[#4190f7]/10 dark:text-[#4190f7]'
							}`}
						>
							{action.label}
						</button>
					)
				})}
			</div>
		)
	}

	return (
		<div className="flex flex-wrap items-center gap-2">
			{resolvedActions.map((action) => {
				const isUrl = action.message.startsWith('url:')
				const actionKey = action.compositeId

				if (isUrl) {
					return <ActionLink key={actionKey} action={action} variant="suggestion" />
				}

				return (
					<button
						key={actionKey}
						type="button"
						disabled={!onActionClick}
						onClick={() => handleActionClick(action)}
						className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
							!clickedIds.has(action.compositeId)
								? onActionClick
									? 'border-[#2172e5]/10 bg-[#2172e5]/4 text-[#2172e5]/55 hover:border-[#2172e5]/20 hover:bg-[#2172e5]/8 hover:text-[#2172e5]/75 active:scale-[0.97] dark:border-[#4190f7]/10 dark:bg-[#4190f7]/5 dark:text-[#4190f7]/50 dark:hover:border-[#4190f7]/20 dark:hover:bg-[#4190f7]/10 dark:hover:text-[#4190f7]/75'
									: 'border-[#2172e5]/5 bg-[#2172e5]/2 text-[#2172e5]/30 dark:border-[#4190f7]/5 dark:bg-[#4190f7]/2 dark:text-[#4190f7]/25'
								: 'border-[#2172e5]/25 bg-[#2172e5]/8 text-[#2172e5]/70 dark:border-[#4190f7]/25 dark:bg-[#4190f7]/8 dark:text-[#4190f7]/70'
						}`}
					>
						{action.label}
					</button>
				)
			})}
		</div>
	)
}
