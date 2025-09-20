import { useState } from 'react'
import { Icon } from '~/components/Icon'
import type { ChatSession } from '../hooks/useChatHistory'

interface SessionItemProps {
	session: ChatSession
	isActive: boolean
	onClick: () => void
	onDelete: () => void
	onUpdateTitle: (title: string) => void
	isUpdating?: boolean
}

export function SessionItem({ session, isActive, onClick, onDelete, onUpdateTitle, isUpdating }: SessionItemProps) {
	const [isEditing, setIsEditing] = useState(false)
	const [title, setTitle] = useState(session.title)
	const [showConfirm, setShowConfirm] = useState(false)

	const handleSave = () => {
		if (title.trim() && title !== session.title) {
			onUpdateTitle(title.trim())
		}
		setIsEditing(false)
	}

	const handleCancel = () => {
		setTitle(session.title)
		setIsEditing(false)
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault()
			handleSave()
		} else if (e.key === 'Escape') {
			handleCancel()
		}
	}

	const handleDelete = () => {
		if (showConfirm) {
			onDelete()
			setShowConfirm(false)
		} else {
			setShowConfirm(true)
			setTimeout(() => setShowConfirm(false), 3000)
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

	return (
		<div
			className={`group relative cursor-pointer rounded-md border p-3 transition-colors ${
				isActive
					? 'border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20'
					: 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50'
			}`}
			onClick={isEditing ? undefined : onClick}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0 flex-1">
					{isEditing ? (
						<input
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							onBlur={handleSave}
							onKeyDown={handleKeyDown}
							className="m-0 w-full border-none bg-transparent p-0 text-sm font-medium outline-none"
							autoFocus
							disabled={isUpdating}
						/>
					) : (
						<h3
							className="truncate text-sm font-medium text-gray-900 dark:text-white"
							onDoubleClick={() => setIsEditing(true)}
						>
							{session.title}
						</h3>
					)}
					<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatDate(session.lastActivity)}</p>
				</div>

				<div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
					{!isEditing && (
						<>
							<button
								onClick={(e) => {
									e.stopPropagation()
									setIsEditing(true)
								}}
								className="rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
								disabled={isUpdating}
							>
								<Icon name="pencil" height={12} width={12} className="text-gray-400" />
							</button>
							<button
								onClick={(e) => {
									e.stopPropagation()
									handleDelete()
								}}
								className={`rounded p-1 transition-colors ${
									showConfirm
										? 'bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50'
										: 'hover:bg-gray-200 dark:hover:bg-gray-700'
								}`}
							>
								<Icon
									name={showConfirm ? 'check' : 'trash-2'}
									height={12}
									width={12}
									className={showConfirm ? 'text-red-600' : 'text-gray-400'}
								/>
							</button>
						</>
					)}
				</div>
			</div>

			{isUpdating && (
				<div className="absolute inset-0 flex items-center justify-center rounded-md bg-white/50 dark:bg-black/50">
					<div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
				</div>
			)}
		</div>
	)
}
