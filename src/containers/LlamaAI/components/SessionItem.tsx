import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { MCP_SERVER } from '~/constants'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useChatHistory, type ChatSession } from '../hooks/useChatHistory'

interface SessionItemProps {
	session: ChatSession
	isActive: boolean
	onSessionSelect: (sessionId: string, data: { conversationHistory: any[]; pagination?: any }) => void
}

export function SessionItem({ session, isActive, onSessionSelect }: SessionItemProps) {
	const router = useRouter()
	const { authorizedFetch } = useAuthContext()
	const { deleteSession, updateSessionTitle, isRestoringSession, isDeletingSession, isUpdatingTitle } = useChatHistory()

	const handleSessionClick = async (sessionId: string) => {
		if (isActive) return
		try {
			router.push(`/ai/${sessionId}`)
		} catch (error) {
			console.error('Failed to restore session:', error)
			router.push(`/ai/${sessionId}`)
		}
	}

	const [isEditing, setIsEditing] = useState(false)
	const formRef = useRef<HTMLFormElement>(null)

	const queryClient = useQueryClient()

	const { mutate: toggleVisibility, isPending: isTogglingVisibility } = useMutation({
		mutationFn: async () => {
			const response = await authorizedFetch(`${MCP_SERVER}/user/sessions/${session.sessionId}/share`, {
				method: 'PUT'
			})
			if (!response.ok) {
				toast.error('Failed to make session public')
				throw new Error('Failed to make session public')
			}
			return response.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['chat-sessions'] })
		}
	})

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (formRef.current && !formRef.current.contains(event.target as Node)) {
				setIsEditing(false)
			}
		}

		if (isEditing) {
			document.addEventListener('mousedown', handleClickOutside)
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [isEditing])

	const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		const form = e.target as HTMLFormElement
		const title = form.newTitle.value
		if (title.trim() && title !== session.title) {
			updateSessionTitle({ sessionId: session.sessionId, title: title.trim() }).then(() => {
				setIsEditing(false)
			})
		}
	}

	const handleDelete = async () => {
		if (window.confirm('Are you sure you want to delete this chat?')) {
			deleteSession(session.sessionId).then(() => {
				setIsEditing(false)
			})
		}
	}

	const [isCopyingLink, setIsCopyingLink] = useState(false)

	if (isEditing) {
		return (
			<form
				ref={formRef}
				onSubmit={handleSave}
				className="group relative -mx-1.5 flex items-center gap-0.5 rounded-sm text-xs hover:bg-[#666]/12 data-[active=true]:bg-(--old-blue) data-[active=true]:text-white dark:hover:bg-[#919296]/12"
			>
				<input
					type="text"
					name="newTitle"
					defaultValue={session.title}
					className="flex-1 overflow-hidden p-1.5 text-left text-xs text-ellipsis whitespace-nowrap"
					autoFocus
					disabled={isUpdatingTitle}
				/>
				<div className="flex items-center justify-center gap-0.5">
					<button
						type="submit"
						className="flex aspect-square items-center justify-center rounded-sm bg-[#666]/12 p-1.5 hover:bg-(--old-blue) hover:text-white focus-visible:bg-(--old-blue) focus-visible:text-white dark:bg-[#919296]/12"
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
						onClick={() => {
							setIsEditing(false)
						}}
						className="flex aspect-square items-center justify-center rounded-sm bg-red-500/10 p-1.5 text-(--error)"
						disabled={isUpdatingTitle}
					>
						<Icon name="x" height={12} width={12} className="shrink-0" />
					</button>
				</div>
			</form>
		)
	}

	return (
		<div
			data-active={isActive}
			className="group relative -mx-1.5 flex items-center rounded-sm text-xs focus-within:bg-[#666]/12 focus-within:text-white hover:bg-[#666]/12 data-[active=true]:bg-(--old-blue) data-[active=true]:text-white dark:focus-within:bg-[#919296]/12 dark:focus-within:text-white dark:hover:bg-[#919296]/12"
		>
			<button
				onClick={() => handleSessionClick(session.sessionId)}
				disabled={isEditing || isDeletingSession || isRestoringSession}
				className="flex-1 overflow-hidden p-1.5 text-left text-ellipsis whitespace-nowrap"
			>
				{session.title}
			</button>
			<div className="flex items-center justify-center opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
				<button
					onClick={() => {
						setIsEditing(true)
					}}
					className="flex aspect-square items-center justify-center rounded-sm p-1.5 hover:bg-(--old-blue) hover:text-white focus-visible:bg-(--old-blue) focus-visible:text-white"
					disabled={isUpdatingTitle || isDeletingSession || isRestoringSession}
				>
					<Icon name="pencil" height={12} width={12} className="shrink-0" />
				</button>
				<Ariakit.MenuProvider>
					<Ariakit.MenuButton className="flex aspect-square items-center justify-center rounded-sm p-1.5 hover:bg-(--old-blue) hover:text-white focus-visible:bg-(--old-blue) focus-visible:text-white">
						<Icon name="ellipsis" height={12} width={12} className="shrink-0" />
						<span className="sr-only">Open menu</span>
					</Ariakit.MenuButton>
					<Ariakit.Menu
						unmountOnHide
						hideOnInteractOutside
						gutter={8}
						wrapperProps={{
							className: 'max-sm:fixed! max-sm:bottom-0! max-sm:top-[unset]! max-sm:transform-none! max-sm:w-full!'
						}}
						className="max-sm:drawer z-10 flex h-[calc(100dvh-80px)] min-w-[180px] flex-col overflow-auto overscroll-contain rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) max-sm:rounded-b-none sm:max-h-[60vh] sm:max-w-md lg:h-full lg:max-h-[var(--popover-available-height)] dark:border-[hsl(204,3%,32%)]"
					>
						<Ariakit.PopoverDismiss className="ml-auto p-2 opacity-50 sm:hidden">
							<Icon name="x" className="h-5 w-5" />
						</Ariakit.PopoverDismiss>
						<Ariakit.MenuItem
							onClick={() => {
								try {
									if (session.isPublic && session.shareToken) {
										navigator.clipboard.writeText(`${window.location.origin}/ai/shared/${session.shareToken}`)
									}
								} catch (error) {
									console.error('Failed to copy link:', error)
								} finally {
									setIsCopyingLink(true)
									setTimeout(() => {
										setIsCopyingLink(false)
									}, 500)
								}
							}}
							hideOnClick={false}
							disabled={!session.isPublic || !session.shareToken || isTogglingVisibility}
							className="flex shrink-0 cursor-pointer items-center gap-2 overflow-hidden border-b border-(--form-control-border) px-3 py-2 text-ellipsis whitespace-nowrap first-of-type:rounded-t-md last-of-type:rounded-b-md hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) aria-disabled:cursor-not-allowed aria-disabled:opacity-60 data-active-item:bg-(--primary-hover)"
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
							disabled={isTogglingVisibility || isUpdatingTitle || isDeletingSession || isRestoringSession}
							className="flex shrink-0 cursor-pointer items-center gap-2 overflow-hidden border-b border-(--form-control-border) px-3 py-2 text-ellipsis whitespace-nowrap first-of-type:rounded-t-md last-of-type:rounded-b-md hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) aria-disabled:cursor-not-allowed aria-disabled:opacity-60 data-active-item:bg-(--primary-hover)"
						>
							{isTogglingVisibility ? (
								<LoadingSpinner size={14} />
							) : (
								<Icon name={session.isPublic ? 'eye' : 'link'} height={14} width={14} className="shrink-0" />
							)}
							{session.isPublic ? 'Make Private' : 'Make Public'}
						</Ariakit.MenuItem>
						<Ariakit.MenuItem
							onClick={handleDelete}
							disabled={isUpdatingTitle || isDeletingSession || isRestoringSession || isTogglingVisibility}
							data-deleting={isDeletingSession}
							className="flex shrink-0 cursor-pointer items-center gap-2 overflow-hidden border-b border-(--form-control-border) px-3 py-2 text-ellipsis whitespace-nowrap first-of-type:rounded-t-md last-of-type:rounded-b-md hover:bg-red-500/10 hover:text-(--error) focus-visible:bg-red-500/10 focus-visible:text-(--error) data-active-item:bg-red-500/10 data-active-item:text-(--error) data-[deleting=true]:bg-red-500/10 data-[deleting=true]:text-(--error)"
						>
							{isDeletingSession ? (
								<LoadingSpinner size={14} />
							) : (
								<Icon name="trash-2" height={14} width={14} className="shrink-0" />
							)}
							Delete Session
						</Ariakit.MenuItem>
					</Ariakit.Menu>
				</Ariakit.MenuProvider>
			</div>
			{isRestoringSession ? (
				<span className="absolute top-0 right-0 bottom-0 left-0 flex items-center justify-center rounded-sm bg-(--cards-bg)/70">
					<LoadingSpinner size={12} />
				</span>
			) : null}
		</div>
	)
}
