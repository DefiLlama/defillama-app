import * as React from 'react'
import Layout from '~/layout'

interface TemporarilyDisabledPageProps {
	title: string
	description?: string
	keywords?: string
	canonicalUrl?: string
	heading?: React.ReactNode
	children: React.ReactNode
}

export function TemporarilyDisabledPage({
	title,
	description = 'This page is temporarily disabled and will be back shortly.',
	keywords = '',
	canonicalUrl,
	heading = 'Temporarily disabled',
	children
}: TemporarilyDisabledPageProps) {
	return (
		<Layout title={title} description={description} keywords={keywords} canonicalUrl={canonicalUrl}>
			<div className="isolate flex flex-1 flex-col items-center justify-center gap-4 rounded-md border border-(--cards-border) bg-(--cards-bg) p-6 text-center">
				<h1 className="text-xl font-semibold">{heading}</h1>
				<div className="flex max-w-xl flex-col gap-3 text-base text-(--text-label)">{children}</div>
			</div>
		</Layout>
	)
}
