import type { ReactNode } from 'react'
import { BasicLink } from '~/components/Link'

export function MarketsPageHeader({
	title,
	meta,
	description,
	backHref = '/markets',
	backLabel = 'Markets',
	showBack = true
}: {
	title: ReactNode
	meta?: ReactNode
	description?: ReactNode
	backHref?: string
	backLabel?: string
	showBack?: boolean
}) {
	return (
		<header className="flex flex-col gap-3">
			{showBack ? (
				<BasicLink href={backHref} shallow className="w-fit text-sm text-(--link-text) hover:underline">
					← {backLabel}
				</BasicLink>
			) : null}
			<div className="flex flex-col gap-1.5">
				<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
					<h1 className="text-2xl font-semibold capitalize">{title}</h1>
					{meta}
				</div>
				{description ? <p className="text-sm text-(--text-label)">{description}</p> : null}
			</div>
		</header>
	)
}
