import * as React from 'react'
import RouterLink from 'next/link'

interface BasicLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
	href: string
	prefetch?: boolean
	shallow?: boolean
	onClick?: React.MouseEventHandler<HTMLAnchorElement>
}

export const BasicLink = (props: BasicLinkProps) => (
	<RouterLink {...props} prefetch={props.prefetch ?? false} legacyBehavior={false}>
		{props.children}
	</RouterLink>
)
