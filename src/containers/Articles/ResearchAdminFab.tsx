import { useIsFetching } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { ResearchIcon } from '~/components/ResearchIcon'
import { useAuthContext } from '~/containers/Subscription/auth'
import { isResearcher } from './ArticlesAccessGate'

export function ResearchAdminFab() {
	const { user, isAuthenticated, loaders } = useAuthContext()
	const router = useRouter()
	const landingLoading = useIsFetching({ queryKey: ['research-landing'] }) > 0

	if (loaders.userLoading || !isAuthenticated || !isResearcher(user)) return null
	if (router.pathname.startsWith('/research/admin')) return null
	if (landingLoading) return null

	return (
		<div className="pointer-events-none fixed top-[74px] right-3 z-30 lg:top-3 lg:right-4">
			<Link
				href="/research/admin"
				className="pointer-events-auto flex items-center gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) px-3 py-2 text-sm font-medium text-(--text-primary) shadow-lg transition-colors hover:border-(--link-text)/40 hover:text-(--link-text)"
				aria-label="Open research admin"
			>
				<ResearchIcon name="research-admin" className="size-4" aria-hidden />
				Admin
			</Link>
		</div>
	)
}
