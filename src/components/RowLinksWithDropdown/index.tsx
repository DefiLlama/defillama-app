import { LinksWithDropdown } from './LinksWithDropdown'
import { OtherLinks } from './OtherLinks'

interface ILink {
	label: string
	to: string
}

interface IRowLinksProps {
	links: ILink[]
	activeLink?: string
	alternativeOthersText?: string
}

export const RowLinksWithDropdown = (props: IRowLinksProps) => {
	return (
		<span>
			<span className="sm:hidden">
				<OtherLinks
					name={
						props.links.find((link) => link.label === props.activeLink)
							? props.activeLink
							: (props.alternativeOthersText ?? 'Others')
					}
					options={props.links}
					isActive={true}
					className="w-full justify-between"
				/>
			</span>
			<div className="flex flex-nowrap rounded-md border border-(--cards-border) bg-(--cards-bg) max-sm:hidden">
				<LinksWithDropdown {...props} />
			</div>
		</span>
	)
}
