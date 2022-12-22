import { useMedia } from '~/hooks'
import { LinksWithDropdown, RowLinksWrapper } from './LinksWithDropdown'
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

const RowLinksWithDropdown = (props: IRowLinksProps) => {
	const isSmall = useMedia(`(max-width: 37.5rem)`)

	if (isSmall) {
		return (
			<OtherLinks
				name={
					props.links.find((link) => link.label === props.activeLink)
						? props.activeLink
						: props.alternativeOthersText ?? 'Others'
				}
				options={props.links}
			/>
		)
	}

	return <LinksWithDropdown {...props} />
}

export { RowLinksWrapper, RowLinksWithDropdown }
