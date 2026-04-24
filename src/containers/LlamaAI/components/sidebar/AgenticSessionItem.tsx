import * as Ariakit from '@ariakit/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Router from 'next/router'
import { memo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { Tooltip } from '~/components/Tooltip'
import { AI_SERVER } from '~/constants'
import { useLlamaAIChrome } from '~/containers/LlamaAI/chrome'
import { useClickOutside } from '~/containers/LlamaAI/hooks/useClickOutside'
import { SESSIONS_QUERY_KEY } from '~/containers/LlamaAI/hooks/useSessionList'
import type { ChatSession } from '~/containers/LlamaAI/types'
import { assertResponse } from '~/containers/LlamaAI/utils/assertResponse'
import { useAuthContext } from '~/containers/Subscription/auth'
import { trackUmamiEvent } from '~/utils/analytics/umami'

interface AgenticSessionItemProps {
	session: ChatSession
	isActive: boolean
	onSessionSelect: (sessionId: string) => void
	onDelete: (sessionId: string) => Promise<void>
	onUpdateTitle: (args: { sessionId: string; title: string }) => Promise<void>
	isRestoring: boolean
	isDeleting: boolean
	isUpdatingTitle: boolean
	style: React.CSSProperties
	selectMode?: boolean
	isSelected?: boolean
	onToggleSelect?: (sessionId: string) => void
	onPinSession?: (sessionId: string) => Promise<void>
}

export const AgenticSessionItem = memo(function AgenticSessionItem({
	session,
	isActive,
	onSessionSelect: _onSessionSelect,
	onDelete,
	onUpdateTitle,
	isRestoring,
	isDeleting,
	isUpdatingTitle,
	style,
	selectMode,
	isSelected,
	onToggleSelect,
	onPinSession
}: AgenticSessionItemProps) {
	const { authorizedFetch } = useAuthContext()
	const { hideSidebar } = useLlamaAIChrome()
	const queryClient = useQueryClient()

	const [isEditing, setIsEditing] = useState(false)
	const [isCopyingLink, setIsCopyingLink] = useState(false)
	const formRef = useRef<HTMLFormElement>(null)

	const { mutate: toggleVisibility, isPending: isTogglingVisibility } = useMutation({
		mutationFn: async () => {
			const response = assertResponse(
				await authorizedFetch(`${AI_SERVER}/user/sessions/${session.sessionId}/share`, {
					method: 'PUT'
				}),
				'Failed to update session visibility'
			)
			return response.json()
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] })
		},
		onError: () => {
			toast.error(`Failed to make session ${session.isPublic ? 'private' : 'public'}`)
			void queryClient.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] })
		}
	})

	useClickOutside(formRef, () => setIsEditing(false), isEditing)

	const handleSessionClick = (sessionId: string) => {
		if (isActive) return
		trackUmamiEvent('llamaai-session-click')
		void Router.push(`/ai/chat/${sessionId}`, undefined, { shallow: true })
		if (document.documentElement.clientWidth < 1024) {
			hideSidebar()
		}
	}

	const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		const form = e.currentTarget
		const title = (form.elements.namedItem('newTitle') as HTMLInputElement | null)?.value ?? ''
		if (title.trim() && title !== session.title) {
			try {
				await onUpdateTitle({ sessionId: session.sessionId, title: title.trim() })
				setIsEditing(false)
			} catch (err) {
				console.error('Failed to update title:', err)
			}
		}
	}

	const handleDelete = async () => {
		if (window.confirm('Are you sure you want to delete this chat?')) {
			trackUmamiEvent('llamaai-session-delete')
			try {
				await onDelete(session.sessionId)
				setIsEditing(false)
			} catch (err) {
				console.error('Failed to delete session:', err)
			}
		}
	}

	if (isEditing) {
		return (
			<form
				ref={formRef}
				onSubmit={(e) => void handleSave(e)}
				className="group relative -mx-1.5 flex items-center gap-0.5 rounded-sm text-xs hover:bg-[#f7f7f7] data-[active=true]:bg-(--old-blue) data-[active=true]:text-white dark:hover:bg-[#222324]"
				style={style}
			>
				<input
					type="text"
					name="newTitle"
					defaultValue={session.title}
					autoFocus
					onFocus={(e) => e.currentTarget.select()}
					className="flex-1 overflow-hidden p-1.5 text-left text-xs text-ellipsis whitespace-nowrap"
					disabled={isUpdatingTitle}
				/>
				<div className="flex items-center justify-center gap-0.5">
					<button
						type="submit"
						className="flex aspect-square items-center justify-center rounded-sm bg-(--old-blue) p-1.5 text-white"
						disabled={isUpdatingTitle}
					>
						{isUpdatingTitle ? (
							<LoadingSpinner size={12} />
						) : (
							<Icon name="check" height={12} width={12} className="shrink-0" />
						)}
					</button>
					<button
						type="button"
						onClick={() => setIsEditing(false)}
						className="flex aspect-square items-center justify-center rounded-sm bg-red-500/20 p-1.5 text-(--error)"
						disabled={isUpdatingTitle}
					>
						<Icon name="x" height={12} width={12} className="shrink-0" />
					</button>
				</div>
			</form>
		)
	}

	if (selectMode) {
		return (
			<button
				type="button"
				onClick={() => onToggleSelect?.(session.sessionId)}
				className="group relative -mx-1.5 flex w-full items-center gap-2 rounded-sm p-1.5 text-left text-xs hover:bg-[#f7f7f7] dark:hover:bg-[#222324]"
				style={style}
			>
				<span
					data-checked={isSelected}
					className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border border-[#ccc] data-[checked=true]:border-(--old-blue) data-[checked=true]:bg-(--old-blue) dark:border-[#555] dark:data-[checked=true]:border-(--old-blue)"
				>
					{isSelected ? (
						<svg
							className="h-2.5 w-2.5 text-white"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="3"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<polyline points="20 6 9 17 4 12" />
						</svg>
					) : null}
				</span>
				<span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{session.title}</span>
			</button>
		)
	}

	return (
		<div
			data-active={isActive}
			className="group relative -mx-1.5 flex items-center rounded-sm text-xs focus-within:bg-[#f7f7f7] hover:bg-[#f7f7f7] data-[active=true]:bg-(--old-blue) data-[active=true]:text-white dark:focus-within:bg-[#222324] dark:hover:bg-[#222324]"
			style={style}
		>
			<button
				type="button"
				onClick={(e) => {
					if (e.metaKey || e.ctrlKey) {
						trackUmamiEvent('llamaai-session-click')
						window.open(`/ai/chat/${session.sessionId}`, '_blank')
						return
					}
					handleSessionClick(session.sessionId)
				}}
				aria-disabled={isEditing || isDeleting || isRestoring}
				className="flex flex-1 items-center gap-1 overflow-hidden p-1.5 text-left aria-disabled:pointer-events-none aria-disabled:opacity-60"
			>
				{session.isPinned ? <Icon name="pin" height={10} width={10} className="shrink-0 opacity-40" /> : null}
				<span className="overflow-hidden text-ellipsis whitespace-nowrap">{session.title}</span>
			</button>
			<div className="flex items-center justify-center opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
				<Tooltip
					content="Edit Session Title"
					render={<button onClick={() => setIsEditing(true)} disabled={isUpdatingTitle || isDeleting || isRestoring} />}
					className="flex aspect-square items-center justify-center rounded-sm p-1.5 hover:bg-(--old-blue) hover:text-white focus-visible:bg-(--old-blue) focus-visible:text-white"
				>
					<Icon name="pencil" height={12} width={12} className="shrink-0" />
				</Tooltip>
				<Ariakit.MenuProvider>
					<Ariakit.MenuButton className="flex aspect-square items-center justify-center rounded-sm p-1.5 hover:bg-(--old-blue) hover:text-white focus-visible:bg-(--old-blue) focus-visible:text-white">
						<Icon name="ellipsis" height={12} width={12} className="shrink-0" />
						<span className="sr-only">Open menu</span>
					</Ariakit.MenuButton>
					<Ariakit.Menu
						portal
						unmountOnHide
						hideOnInteractOutside
						gutter={8}
						wrapperProps={{
							className: 'max-sm:fixed! max-sm:bottom-0! max-sm:top-[unset]! max-sm:transform-none! max-sm:w-full!'
						}}
						className="z-50 flex thin-scrollbar min-w-[180px] flex-col overflow-auto overscroll-contain rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) text-(--text-primary) max-sm:h-[calc(100dvh-80px)] max-sm:drawer max-sm:rounded-b-none sm:max-h-[min(400px,60dvh)] sm:max-w-md lg:max-h-(--popover-available-height) dark:border-[hsl(204,3%,32%)]"
					>
						<Ariakit.PopoverDismiss className="ml-auto p-2 opacity-50 sm:hidden">
							<Icon name="x" className="h-5 w-5" />
						</Ariakit.PopoverDismiss>
						<Ariakit.MenuItem
							onClick={() => {
								void onPinSession?.(session.sessionId)
							}}
							className="flex shrink-0 cursor-pointer items-center gap-2 overflow-hidden border-b border-(--form-control-border) px-3 py-2 text-ellipsis whitespace-nowrap cv-auto-37 first-of-type:rounded-t-md last-of-type:rounded-b-md hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) data-active-item:bg-(--primary-hover)"
						>
							<Icon name="pin" height={14} width={14} className="shrink-0" />
							{session.isPinned ? 'Unpin' : 'Pin to Top'}
						</Ariakit.MenuItem>
						<Ariakit.MenuItem
							onClick={() => {
								void (async () => {
									try {
										if (session.isPublic) {
											if (session.shareToken) {
												await navigator.clipboard.writeText(
													`${window.location.origin}/ai/chat/shared/${session.shareToken}`
												)
												trackUmamiEvent('llamaai-session-share')
												setIsCopyingLink(true)
												setTimeout(() => {
													setIsCopyingLink(false)
												}, 500)
											}
										}
									} catch (error) {
										console.error(error)
										toast.error('Failed to copy link')
									}
								})()
							}}
							hideOnClick={false}
							disabled={!session.isPublic || !session.shareToken || isTogglingVisibility}
							className="flex shrink-0 cursor-pointer items-center gap-2 overflow-hidden border-b border-(--form-control-border) px-3 py-2 text-ellipsis whitespace-nowrap cv-auto-37 first-of-type:rounded-t-md last-of-type:rounded-b-md hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) aria-disabled:cursor-not-allowed aria-disabled:opacity-60 data-active-item:bg-(--primary-hover)"
						>
							{isCopyingLink ? (
								<Icon name="check-circle" height={14} width={14} className="shrink-0" />
							) : (
								<Icon name="copy" height={14} width={14} className="shrink-0" />
							)}
							{session.isPublic ? 'Copy Link' : 'Make Public to Share'}
						</Ariakit.MenuItem>
						<Ariakit.MenuItem
							onClick={() => {
								if (session.isPublic) {
									if (window.confirm('This conversation is currently public. Do you want to make it private?')) {
										toggleVisibility()
									}
								} else {
									toggleVisibility()
								}
							}}
							hideOnClick={false}
							disabled={isTogglingVisibility || isUpdatingTitle || isDeleting || isRestoring}
							className="flex shrink-0 cursor-pointer items-center gap-2 overflow-hidden border-b border-(--form-control-border) px-3 py-2 text-ellipsis whitespace-nowrap cv-auto-37 first-of-type:rounded-t-md last-of-type:rounded-b-md hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) aria-disabled:cursor-not-allowed aria-disabled:opacity-60 data-active-item:bg-(--primary-hover)"
						>
							{isTogglingVisibility ? (
								<LoadingSpinner size={14} />
							) : (
								<Icon name={session.isPublic ? 'eye' : 'link'} height={14} width={14} className="shrink-0" />
							)}
							{session.isPublic ? 'Make Private' : 'Make Public'}
						</Ariakit.MenuItem>
						<Ariakit.MenuItem
							onClick={() => {
								void handleDelete()
							}}
							disabled={isUpdatingTitle || isDeleting || isRestoring || isTogglingVisibility}
							data-deleting={isDeleting}
							className="flex shrink-0 cursor-pointer items-center gap-2 overflow-hidden border-b border-(--form-control-border) px-3 py-2 text-ellipsis whitespace-nowrap cv-auto-37 first-of-type:rounded-t-md last-of-type:rounded-b-md hover:bg-red-500/10 hover:text-(--error) focus-visible:bg-red-500/10 focus-visible:text-(--error) data-active-item:bg-red-500/10 data-active-item:text-(--error) data-[deleting=true]:bg-red-500/10 data-[deleting=true]:text-(--error)"
						>
							{isDeleting ? (
								<LoadingSpinner size={14} />
							) : (
								<Icon name="trash-2" height={14} width={14} className="shrink-0" />
							)}
							Delete Session
						</Ariakit.MenuItem>
					</Ariakit.Menu>
				</Ariakit.MenuProvider>
			</div>
			{isRestoring ? (
				<span className="absolute top-0 right-0 bottom-0 left-0 flex items-center justify-center rounded-sm bg-(--cards-bg)/70">
					<LoadingSpinner size={12} />
				</span>
			) : null}
		</div>
	)
})
