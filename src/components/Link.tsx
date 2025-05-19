import * as React from 'react'
import RouterLink from 'next/link'

interface BasicLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
	prefetch?: boolean
	shallow?: boolean
	onClick?: React.MouseEventHandler<HTMLAnchorElement>
}

export const BasicLink = ({ href, children, prefetch, shallow, ...props }: BasicLinkProps) => (
	<RouterLink href={href} passHref prefetch={prefetch ?? false} shallow={shallow ?? false}>
		<a {...props}>{children}</a>
	</RouterLink>
)
