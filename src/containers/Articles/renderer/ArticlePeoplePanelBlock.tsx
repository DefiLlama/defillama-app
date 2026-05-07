import type { ArticlePeoplePanelConfig } from '../editor/peoplePanel'

type Props = {
	config: ArticlePeoplePanelConfig
	compact?: boolean
}

export function ArticlePeoplePanelBlock({ config, compact = false }: Props) {
	if (config.items.length === 0) return null
	return (
		<section
			data-people-panel
			className={`article-people-panel not-prose grid gap-6 ${compact ? '' : 'my-8'}`}
		>
			{config.label ? (
				<div className="font-jetbrains text-[11px] tracking-[0.18em] text-(--text-tertiary) uppercase">
					{config.label}
				</div>
			) : null}
			<div className="grid gap-7">
				{config.items.map((item, idx) => {
					const nameNode = item.href ? (
						<a
							href={item.href}
							target="_blank"
							rel="noopener noreferrer"
							className="text-(--text-primary) underline-offset-4 hover:text-(--link-text) hover:underline"
						>
							{item.name || item.href}
						</a>
					) : (
						<span className="text-(--text-primary)">{item.name}</span>
					)
					return (
						<article
							key={idx}
							className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-5 sm:grid-cols-[88px_minmax(0,1fr)]"
						>
							{item.src ? (
								<img
									src={item.src}
									alt={item.name || ''}
									loading="lazy"
									decoding="async"
									className="aspect-square w-full rounded-full border border-(--cards-border) bg-(--app-bg) object-cover"
								/>
							) : (
								<div
									aria-hidden
									className="aspect-square w-full rounded-full border border-dashed border-(--cards-border) bg-(--app-bg)"
								/>
							)}
							<div className="grid gap-1.5">
								{item.name ? (
									<h4 className="text-base leading-tight font-semibold">{nameNode}</h4>
								) : null}
								{item.bio ? (
									<p className="text-sm leading-relaxed text-(--text-secondary)">{item.bio}</p>
								) : null}
							</div>
						</article>
					)
				})}
			</div>
		</section>
	)
}
