import Link from 'next/link'
import { ArticleProxyAuthProvider } from '~/containers/Articles/ArticleProxyAuthProvider'
import { ArticlesAccessGate } from '~/containers/Articles/ArticlesAccessGate'
import Layout from '~/layout'

export default function ResearchAdminHubPage() {
	return (
		<Layout
			title="Research Admin - DefiLlama"
			description="Internal admin tools for the research platform."
			canonicalUrl="/research/admin"
			noIndex
			hideDesktopSearch
		>
			<ArticleProxyAuthProvider>
				<ArticlesAccessGate>
					<div className="mx-auto grid w-full max-w-4xl gap-6 px-1 pb-16">
						<header className="pt-2 pb-2">
							<Link
								href="/research"
								className="inline-flex items-center gap-1 text-xs text-(--text-tertiary) transition-colors hover:text-(--text-primary)"
							>
								<span aria-hidden>←</span> Research
							</Link>
							<h1 className="mt-2 text-3xl font-semibold tracking-tight text-(--text-primary)">Admin</h1>
							<p className="mt-1 text-sm text-(--text-secondary)">Internal tools for the research platform.</p>
						</header>

						<div className="grid gap-4 sm:grid-cols-2">
							<Link
								href="/research/new"
								className="group grid gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 transition-colors hover:border-(--link-text)/40"
							>
								<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
									Authoring
								</span>
								<span className="text-lg font-semibold text-(--text-primary) group-hover:text-(--link-text)">
									Write new article
								</span>
								<span className="text-sm text-(--text-secondary)">Start a fresh draft in the research editor.</span>
							</Link>
							<Link
								href="/research/mine"
								className="group grid gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 transition-colors hover:border-(--link-text)/40"
							>
								<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
									Authoring
								</span>
								<span className="text-lg font-semibold text-(--text-primary) group-hover:text-(--link-text)">
									My articles
								</span>
								<span className="text-sm text-(--text-secondary)">
									Review and edit drafts and published articles you authored.
								</span>
							</Link>
							<Link
								href="/research/admin/curation"
								className="group grid gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 transition-colors hover:border-(--link-text)/40"
							>
								<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
									Editorial
								</span>
								<span className="text-lg font-semibold text-(--text-primary) group-hover:text-(--link-text)">
									Curation
								</span>
								<span className="text-sm text-(--text-secondary)">
									Pick the Spotlight and Insights articles shown on /research.
								</span>
							</Link>
							<Link
								href="/research/admin/banners"
								className="group grid gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 transition-colors hover:border-(--link-text)/40"
							>
								<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
									Promotions
								</span>
								<span className="text-lg font-semibold text-(--text-primary) group-hover:text-(--link-text)">
									Banners
								</span>
								<span className="text-sm text-(--text-secondary)">
									Configure the dismissible strip shown above articles or on /research.
								</span>
							</Link>
							<Link
								href="/research/admin/reports"
								className="group grid gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 transition-colors hover:border-(--link-text)/40"
							>
								<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
									Reports
								</span>
								<span className="text-lg font-semibold text-(--text-primary) group-hover:text-(--link-text)">
									Report PDFs
								</span>
								<span className="text-sm text-(--text-secondary)">
									Attach a PDF, carousel image, sponsor logo, and description to each Report article.
								</span>
							</Link>
						</div>
					</div>
				</ArticlesAccessGate>
			</ArticleProxyAuthProvider>
		</Layout>
	)
}
