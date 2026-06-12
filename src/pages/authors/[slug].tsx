import { useQuery } from '@tanstack/react-query'
import type { GetServerSideProps, InferGetServerSidePropsType } from 'next'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { AuthorApiError, getAuthorBySlug, getMyDashboardAuthorProfile } from '~/containers/Authors/api'
import { AuthorProfileView, compactText, fallbackAuthorStats } from '~/containers/Authors/AuthorProfileView'
import { AuthorOgImage, buildAuthorJsonLd } from '~/containers/Authors/AuthorSeo'
import type { AuthorDashboardSort } from '~/containers/Authors/types'
import { useAuthContext } from '~/containers/Subscription/auth'
import Layout from '~/layout'
import { withServerSidePropsTelemetry } from '~/utils/telemetry'

const authorPageCacheHeader = 'public, s-maxage=300, stale-while-revalidate=3600'
const DASHBOARD_LIMIT = 24

type AuthorPageProps = {
	data: Awaited<ReturnType<typeof getAuthorBySlug>> | null
	slug: string
	status: number
}

function numberParam(value: unknown, fallback: number) {
	const raw = Array.isArray(value) ? value[0] : value
	const parsed = Number(raw)
	return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

function sortParam(value: unknown): AuthorDashboardSort {
	const raw = Array.isArray(value) ? value[0] : value
	return raw === 'popular' || raw === 'likes' ? raw : 'recent'
}

function authorHref(slug: string, params: { page?: number; sort?: AuthorDashboardSort } = {}) {
	const searchParams = new URLSearchParams()
	if (params.page && params.page > 1) searchParams.set('dashboardPage', String(params.page))
	if (params.sort && params.sort !== 'recent') searchParams.set('dashboardSort', params.sort)
	const qs = searchParams.toString()
	return `/authors/${slug}${qs ? `?${qs}` : ''}`
}

function AuthorNotFound({ canonicalPath }: { canonicalPath: string }) {
	return (
		<Layout
			title="Author Not Found - DefiLlama"
			description="This DefiLlama dashboard author profile is not available."
			canonicalUrl={canonicalPath}
			noIndex
		>
			<div className="mx-auto flex min-h-[56vh] max-w-3xl flex-col items-start justify-center gap-5 px-4">
				<div className="grid gap-2">
					<p className="text-[10px] font-semibold tracking-[0.2em] text-(--text-tertiary) uppercase">Author index</p>
					<h1 className="text-[clamp(2rem,1.4rem+2vw,3.25rem)] leading-tight font-semibold text-(--text-primary)">
						Author not found
					</h1>
					<p className="max-w-lg text-sm leading-6 text-(--text-secondary)">
						This dashboard author profile is not available.
					</p>
				</div>
				<BasicLink href="/pro" className="rounded-md bg-(--link-text) px-4 py-2 text-sm font-medium text-white">
					Browse dashboards
				</BasicLink>
			</div>
		</Layout>
	)
}

const getServerSidePropsHandler: GetServerSideProps<AuthorPageProps> = async (context) => {
	const slug = context.params?.slug
	const authorSlug = typeof slug === 'string' ? slug : ''
	const dashboardPage = numberParam(context.query.dashboardPage, 1)
	const dashboardSort = sortParam(context.query.dashboardSort)
	context.res.setHeader('Cache-Control', authorPageCacheHeader)

	if (!authorSlug) {
		context.res.statusCode = 404
		return { props: { data: null, slug: '', status: 404 } }
	}

	try {
		const data = await getAuthorBySlug(authorSlug, { dashboardPage, dashboardLimit: DASHBOARD_LIMIT, dashboardSort })
		return { props: { data, slug: authorSlug, status: 200 } }
	} catch (error) {
		if (!(error instanceof AuthorApiError) || error.status !== 404) {
			throw error
		}
		context.res.statusCode = 404
		return { props: { data: null, slug: authorSlug, status: 404 } }
	}
}

export default function AuthorPage({ data, slug, status }: InferGetServerSidePropsType<typeof getServerSideProps>) {
	const router = useRouter()
	const { authorizedFetch, isAuthenticated, loaders, user } = useAuthContext()
	const canonicalPath = `/authors/${slug}`
	const dashboardPage = numberParam(router.query.dashboardPage, 1)
	const dashboardSort = sortParam(router.query.dashboardSort)

	const canLoadOwnProfile = isAuthenticated && !loaders.userLoading && !!user?.id
	const { data: viewerProfile } = useQuery({
		queryKey: ['dashboard-author-profile', user?.id],
		queryFn: () => getMyDashboardAuthorProfile(authorizedFetch),
		enabled: canLoadOwnProfile,
		retry: false,
		refetchOnWindowFocus: false
	})

	const { data: authedData } = useQuery({
		queryKey: ['author-page', slug, dashboardPage, dashboardSort, user?.id],
		queryFn: () =>
			getAuthorBySlug(slug, { dashboardPage, dashboardLimit: DASHBOARD_LIMIT, dashboardSort }, authorizedFetch),
		enabled: !!data && status === 200 && isAuthenticated && !loaders.userLoading,
		staleTime: 60_000,
		retry: false,
		refetchOnWindowFocus: false
	})

	if (!data || status === 404) {
		return <AuthorNotFound canonicalPath={canonicalPath} />
	}

	const view = authedData ?? data
	const { author, dashboards } = view
	const stats = view.stats ?? fallbackAuthorStats(dashboards.items)
	const isOwnProfile = viewerProfile?.slug === author.slug
	const description = compactText(author.bio, `${author.displayName} builds public DefiLlama Pro dashboards.`)

	return (
		<Layout
			title={`${author.displayName} - DefiLlama Dashboard Author`}
			description={description}
			canonicalUrl={canonicalPath}
			jsonLd={buildAuthorJsonLd(author, stats, dashboards.totalItems)}
		>
			<AuthorOgImage author={author} />
			<div className="mx-auto grid w-full max-w-7xl gap-6 pro-dashboard px-3 py-5 lg:px-0">
				<BasicLink
					href="/pro"
					className="mr-auto flex items-center gap-2 text-sm text-(--text-label) hover:text-(--link-text)"
				>
					<Icon name="arrow-left" className="size-4" />
					Back to Dashboards
				</BasicLink>

				<AuthorProfileView
					view={view}
					sort={dashboardSort}
					isOwnProfile={isOwnProfile}
					hrefFor={(params) => authorHref(author.slug, params)}
				/>
			</div>
		</Layout>
	)
}

export const getServerSideProps = withServerSidePropsTelemetry('/authors/[slug]', getServerSidePropsHandler)
