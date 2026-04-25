import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { Menu } from '~/components/Menu'
import { QuestionHelper } from '~/components/QuestionHelper'
import { slug } from '~/utils'

export function ProtocolInformationCard({
	category,
	projectName,
	projectSlug,
	config,
	url
}: {
	category: string
	projectName: string
	projectSlug: string
	config: any
	url: string
}) {
	return (
		<div className="flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:p-4">
			<h3 className="text-base font-semibold">Information</h3>
			{projectName && projectSlug ? (
				<p className="flex items-center gap-1">
					<span>Protocol:</span>
					<BasicLink href={`/protocol/${projectSlug}`} className="hover:underline">
						{projectName}
					</BasicLink>
				</p>
			) : null}
			<p className="flex items-center gap-1">
				<span>Category:</span>
				<BasicLink href={`/protocols/${slug(category)}`} className="hover:underline">
					{category}
				</BasicLink>
			</p>

			{config?.audits ? (
				<>
					<p className="flex items-center gap-1">
						<span className="flex flex-nowrap items-center gap-1">
							<span>Audits</span>
							<QuestionHelper text="Audits are not a security guarantee" />
							<span>:</span>
						</span>
						{config.audit_links?.length > 0 ? (
							<Menu
								name="Yes"
								options={config.audit_links}
								isExternal
								className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
							/>
						) : (
							<span>No</span>
						)}
					</p>
					{config.audit_note ? <p>Audit Note: {config.audit_note}</p> : null}
				</>
			) : null}
			<div className="flex flex-wrap gap-2">
				{url ? (
					<a
						href={url}
						className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
						target="_blank"
						rel="noopener noreferrer"
					>
						<Icon name="earth" className="h-3 w-3" />
						<span>Website</span>
					</a>
				) : null}
				{config?.github?.length
					? config.github.map((github) => (
							<a
								href={`https://github.com/${github}`}
								className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
								target="_blank"
								rel="noopener noreferrer"
								key={`${config.name}-github-${github}`}
							>
								<Icon name="github" className="h-3 w-3" />
								<span>{config.github.length === 1 ? 'GitHub' : github}</span>
							</a>
						))
					: null}
				{config?.twitter ? (
					<a
						href={`https://x.com/${config.twitter}`}
						className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
						target="_blank"
						rel="noopener noreferrer"
					>
						<Icon name="twitter" className="h-3 w-3" />
						<span>Twitter</span>
					</a>
				) : null}
			</div>
		</div>
	)
}
