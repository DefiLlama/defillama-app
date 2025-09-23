import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
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
	const { restoreSession, deleteSession, updateSessionTitle, isRestoringSession, isDeletingSession, isUpdatingTitle } =
		useChatHistory()

	const handleSessionClick = async (sessionId: string) => {
		if (isActive) return

		try {
			const result = await restoreSession(sessionId)
			onSessionSelect(sessionId, result)
			router.push(`/ai/${sessionId}`)
		} catch (error) {
			console.error('Failed to restore session:', error)
			router.push(`/ai/${sessionId}`)
		}
	}

	const [isEditing, setIsEditing] = useState(false)
	const [shareInfo, setShareInfo] = useState<{ isPublic: boolean; shareUrl?: string }>({
		isPublic: session.isPublic || false,
		shareUrl: session.shareToken ? `${window.location.origin}/ai/shared/${session.shareToken}` : undefined
	})
	const [isSharing, setIsSharing] = useState(false)
	const [showDropdown, setShowDropdown] = useState(false)
	const formRef = useRef<HTMLFormElement>(null)
	const dropdownRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		setShareInfo({
			isPublic: session.isPublic || false,
			shareUrl: session.shareToken ? `${window.location.origin}/ai/shared/${session.shareToken}` : undefined
		})
	}, [session.isPublic, session.shareToken])

	const handleMakePublic = async () => {
		setIsSharing(true)
		try {
			const response = await authorizedFetch(`${MCP_SERVER}/user/sessions/${session.sessionId}/share`, {
				method: 'PUT'
			})
			const data = await response.json()

			if (data.shareToken) {
				const shareUrl = `${window.location.origin}/ai/shared/${data.shareToken}`
				setShareInfo({ ...data, shareUrl })
				navigator.clipboard.writeText(shareUrl)
			} else {
				setShareInfo(data)
			}
		} catch (error) {
			console.error('Failed to make session public:', error)
		} finally {
			setIsSharing(false)
		}
	}

	const handleMakePrivate = async () => {
		setIsSharing(true)
		try {
			const response = await authorizedFetch(`${MCP_SERVER}/user/sessions/${session.sessionId}/share`, {
				method: 'PUT'
			})
			const data = await response.json()
			setShareInfo(data)
		} catch (error) {
			console.error('Failed to make session private:', error)
		} finally {
			setIsSharing(false)
		}
	}

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (formRef.current && !formRef.current.contains(event.target as Node)) {
				setIsEditing(false)
			}
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setShowDropdown(false)
			}
		}

		if (isEditing || showDropdown) {
			document.addEventListener('mousedown', handleClickOutside)
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [isEditing, showDropdown])

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
				<button
					onClick={() => {
						handleDelete()
					}}
					className="flex aspect-square items-center justify-center rounded-sm p-1.5 hover:bg-red-500/10 hover:text-(--error) focus-visible:bg-red-500/10 focus-visible:text-(--error) data-[deleting=true]:bg-red-500/10 data-[deleting=true]:text-(--error)"
					disabled={isUpdatingTitle || isDeletingSession || isRestoringSession}
					data-deleting={isDeletingSession}
				>
					{isDeletingSession ? (
						<LoadingSpinner size={12} />
					) : (
						<Icon name="trash-2" height={12} width={12} className="shrink-0" />
					)}
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
						className="max-sm:drawer z-10 flex h-[calc(100vh-80px)] min-w-[180px] flex-col overflow-auto overscroll-contain rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) max-sm:rounded-b-none sm:max-h-[60vh] sm:max-w-md lg:h-full lg:max-h-[var(--popover-available-height)] dark:border-[hsl(204,3%,32%)]"
					>
						<Ariakit.PopoverDismiss className="ml-auto p-2 opacity-50 sm:hidden">
							<Icon name="x" className="h-5 w-5" />
						</Ariakit.PopoverDismiss>
						<Ariakit.MenuItem
							onClick={() => {
								if (shareInfo.isPublic && shareInfo.shareUrl) {
									navigator.clipboard.writeText(shareInfo.shareUrl)
								}
							}}
							disabled={!shareInfo.isPublic || !shareInfo.shareUrl}
							className="flex shrink-0 cursor-pointer items-center gap-2 overflow-hidden border-b border-(--form-control-border) px-3 py-2 text-ellipsis whitespace-nowrap first-of-type:rounded-t-md last-of-type:rounded-b-md hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) data-active-item:bg-(--primary-hover)"
						>
							<Icon name="copy" height={14} width={14} className="shrink-0" />
							Copy Link
						</Ariakit.MenuItem>
						<Ariakit.MenuItem
							onClick={() => {
								if (shareInfo.isPublic) {
									if (window.confirm('This conversation is currently public. Do you want to make it private?')) {
										handleMakePrivate()
									}
								} else {
									handleMakePublic()
								}
							}}
							disabled={isSharing}
							className="flex shrink-0 cursor-pointer items-center gap-2 overflow-hidden border-b border-(--form-control-border) px-3 py-2 text-ellipsis whitespace-nowrap first-of-type:rounded-t-md last-of-type:rounded-b-md hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) data-active-item:bg-(--primary-hover)"
						>
							<Icon name={shareInfo.isPublic ? 'eye' : 'link'} height={14} width={14} className="shrink-0" />
							{shareInfo.isPublic ? 'Make Private' : 'Make Public'}
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
