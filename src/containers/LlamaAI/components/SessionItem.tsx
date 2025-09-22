import React, { useEffect, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { useChatHistory, type ChatSession } from '../hooks/useChatHistory'

interface SessionItemProps {
	session: ChatSession
	isActive: boolean
	onSessionSelect: (sessionId: string, data: { conversationHistory: any[]; pagination?: any }) => void
}

export function SessionItem({ session, isActive, onSessionSelect }: SessionItemProps) {
	const { restoreSession, deleteSession, updateSessionTitle, isRestoringSession, isDeletingSession, isUpdatingTitle } =
		useChatHistory()

	const handleSessionClick = async (sessionId: string) => {
		if (isActive) return
		try {
			const result = await restoreSession(sessionId)
			onSessionSelect(sessionId, result)
		} catch (error) {
			console.error('Failed to restore session:', error)
		}
	}

	const [isEditing, setIsEditing] = useState(false)
	const formRef = useRef<HTMLFormElement>(null)

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

	const formatDate = (dateString: string) => {
		const date = new Date(dateString)
		const now = new Date()
		const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

		if (diffDays === 0) return 'Today'
		if (diffDays === 1) return 'Yesterday'
		if (diffDays < 7) return `${diffDays} days ago`
		return date.toLocaleDateString()
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
			</div>
			{isRestoringSession ? (
				<span className="absolute top-0 right-0 bottom-0 left-0 flex items-center justify-center rounded-sm bg-(--cards-bg)/70">
					<LoadingSpinner size={12} />
				</span>
			) : null}
		</div>
	)
}
