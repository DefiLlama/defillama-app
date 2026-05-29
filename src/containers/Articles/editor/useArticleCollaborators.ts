import type { QueryClient } from '@tanstack/react-query'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { Dispatch, SetStateAction } from 'react'
import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
	addCollaborator,
	ArticleApiError,
	listCollaborators,
	removeCollaborator,
	transferOwnership,
	updateCollaborator
} from '../api'
import { applyPendingToLocalArticle } from '../document'
import type { LocalArticleDocument } from '../types'

type AuthorizedFetch = (url: string, options?: RequestInit) => Promise<Response | null>

type UseArticleCollaboratorsArgs = {
	articleId: string | undefined
	authorizedFetch: AuthorizedFetch
	queryClient: QueryClient
	setArticle: Dispatch<SetStateAction<LocalArticleDocument>>
	setOwnedArticleCache: (saved: LocalArticleDocument) => void
}

export function useArticleCollaborators({
	articleId,
	authorizedFetch,
	queryClient,
	setArticle,
	setOwnedArticleCache
}: UseArticleCollaboratorsArgs) {
	const [collaboratorEmail, setCollaboratorEmail] = useState('')
	const [collaboratorError, setCollaboratorError] = useState<string | null>(null)
	const collaboratorsQueryKey = useMemo(() => ['research', 'article-collaborators', articleId] as const, [articleId])
	const collaboratorsQuery = useQuery({
		queryKey: collaboratorsQueryKey,
		queryFn: async () => {
			try {
				return await listCollaborators(articleId!, authorizedFetch)
			} catch (error) {
				if (error instanceof ArticleApiError && error.status === 403) return []
				throw error
			}
		},
		enabled: !!articleId,
		retry: false
	})
	const collaborators = collaboratorsQuery.data ?? []
	const collaboratorsLoading = collaboratorsQuery.isLoading
	const collaboratorsLoadError =
		collaboratorsQuery.error instanceof Error
			? collaboratorsQuery.error.message
			: collaboratorsQuery.error
				? 'Failed to load co-authors'
				: null
	const addCollaboratorMutation = useMutation({
		mutationFn: ({ targetArticleId, email }: { targetArticleId: string; email: string }) =>
			addCollaborator(targetArticleId, email, authorizedFetch),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: collaboratorsQueryKey })
		}
	})
	const removeCollaboratorMutation = useMutation({
		mutationFn: ({ targetArticleId, pbUserId }: { targetArticleId: string; pbUserId: string }) =>
			removeCollaborator(targetArticleId, pbUserId, authorizedFetch),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: collaboratorsQueryKey })
		}
	})
	const updateCollaboratorMutation = useMutation({
		mutationFn: ({
			targetArticleId,
			pbUserId,
			hidden
		}: {
			targetArticleId: string
			pbUserId: string
			hidden: boolean
		}) => updateCollaborator(targetArticleId, pbUserId, { hidden }, authorizedFetch),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: collaboratorsQueryKey })
		}
	})
	const transferOwnershipMutation = useMutation({
		mutationFn: ({ targetArticleId, pbUserId }: { targetArticleId: string; pbUserId: string }) =>
			transferOwnership(targetArticleId, { pbUserId }, authorizedFetch),
		onSuccess: (updated) => {
			setOwnedArticleCache(updated)
			void queryClient.invalidateQueries({ queryKey: collaboratorsQueryKey })
		}
	})

	const handleAddCollaborator = async () => {
		if (!articleId) return
		const email = collaboratorEmail.trim()
		if (!email) {
			setCollaboratorError('Enter an email address')
			return
		}
		setCollaboratorError(null)
		try {
			await addCollaboratorMutation.mutateAsync({ targetArticleId: articleId, email })
			setCollaboratorEmail('')
			toast.success('Co-author added')
		} catch (error) {
			const message =
				error instanceof ArticleApiError
					? error.message
					: error instanceof Error
						? error.message
						: 'Failed to add co-author'
			setCollaboratorError(message)
		}
	}

	const handleRemoveCollaborator = async (pbUserId: string) => {
		if (!articleId) return
		try {
			await removeCollaboratorMutation.mutateAsync({ targetArticleId: articleId, pbUserId })
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to remove co-author')
		}
	}

	const handleToggleHidden = async (pbUserId: string, nextHidden: boolean) => {
		if (!articleId) return
		try {
			await updateCollaboratorMutation.mutateAsync({ targetArticleId: articleId, pbUserId, hidden: nextHidden })
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update co-author')
		}
	}

	const handleTransferOwnership = async (pbUserId: string, displayName: string) => {
		if (!articleId) return
		if (!confirm(`Transfer ownership to ${displayName}? You will become a co-author and lose owner-only controls.`))
			return
		try {
			const updated = await transferOwnershipMutation.mutateAsync({ targetArticleId: articleId, pbUserId })
			const merged = applyPendingToLocalArticle(updated, updated.pending)
			setArticle(merged)
			toast.success(`${displayName} is now the owner`)
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to transfer ownership')
		}
	}

	return {
		collaboratorAdding: addCollaboratorMutation.isPending,
		collaboratorEmail,
		collaboratorError,
		collaborators,
		collaboratorsLoadError,
		collaboratorsLoading,
		handleAddCollaborator,
		handleRemoveCollaborator,
		handleToggleHidden,
		handleTransferOwnership,
		setCollaboratorEmail,
		setCollaboratorError
	}
}
