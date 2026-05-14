import type { ReactNode } from 'react'
import { useAuthContext } from '~/containers/Subscription/auth'
import type { AuthModel } from '~/utils/pocketbase'
import type { ArticleDocument } from './types'

export function isResearcher(user: AuthModel | null | undefined): boolean {
	return user?.flags?.is_researcher === true
}

export function hasResearchAccess(user: AuthModel | null | undefined): boolean {
	return user?.flags?.is_llama === true || isResearcher(user)
}

export function canManageResearchArticle(article: { viewerRole?: ArticleDocument['viewerRole'] }): boolean {
	return article.viewerRole === 'owner' || article.viewerRole === 'researcher'
}

export function canEditResearchArticle({
	article,
	isAuthenticated,
	user
}: {
	article: ArticleDocument
	isAuthenticated: boolean
	user: AuthModel | null | undefined
}): boolean {
	return (
		canManageResearchArticle(article) ||
		article.viewerRole === 'collaborator' ||
		(isAuthenticated && isResearcher(user)) ||
		(isAuthenticated && !!user?.id && !!article.authorProfile?.pbUserId && user.id === article.authorProfile.pbUserId)
	)
}

export function useHasArticlesAccess() {
	const { user, isAuthenticated, loaders } = useAuthContext()
	return {
		isLoading: loaders.userLoading,
		isAuthenticated,
		hasAccess: isAuthenticated && hasResearchAccess(user)
	}
}

export function ArticlesAccessGate({
	children,
	loadingFallback = null
}: {
	children: ReactNode
	loadingFallback?: ReactNode
}) {
	const { isLoading, hasAccess } = useHasArticlesAccess()
	if (isLoading) return <>{loadingFallback}</>
	if (!hasAccess) return null
	return <>{children}</>
}
