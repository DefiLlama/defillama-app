import { useRouter } from 'next/router'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useAuthContext } from '~/containers/Subscription/auth'
import type { AuthModel } from '~/utils/pocketbase'
import type { ArticleDocument } from './types'

export const RESEARCH_ACCESS_REDIRECT_PATH = '/research'

export function isResearcher(user: AuthModel | null | undefined): boolean {
	return user?.flags?.is_researcher === true
}

export function hasResearchAccess(user: AuthModel | null | undefined): boolean {
	return isResearcher(user)
}

export function canManageResearchArticle(article: { viewerRole?: ArticleDocument['viewerRole'] }): boolean {
	return article.viewerRole === 'owner' || article.viewerRole === 'researcher'
}

export function canEditResearchArticle({
	article: _article,
	isAuthenticated,
	user
}: {
	article: ArticleDocument
	isAuthenticated: boolean
	user: AuthModel | null | undefined
}): boolean {
	return isAuthenticated && isResearcher(user)
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
	const router = useRouter()

	useEffect(() => {
		if (isLoading || hasAccess) return
		void router.replace(RESEARCH_ACCESS_REDIRECT_PATH)
	}, [hasAccess, isLoading, router])

	if (isLoading) return <>{loadingFallback}</>
	if (!hasAccess) return null
	return <>{children}</>
}
