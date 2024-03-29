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
	variant?: 'primary' | 'secondary'
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
				variant={props.variant ?? 'primary'}
				isActive={true}
			/>
		)
	}

	return <LinksWithDropdown {...props} />
}

export { RowLinksWrapper, RowLinksWithDropdown }
