import RouterLink from 'next/link'
import * as React from 'react'

interface BasicLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
	href: string
	prefetch?: boolean
	shallow?: boolean
	onClick?: React.MouseEventHandler<HTMLAnchorElement>
}

export const BasicLink = React.forwardRef<HTMLAnchorElement, BasicLinkProps>(function BasicLink(props, ref) {
	return (
		<RouterLink {...props} ref={ref} prefetch={props.prefetch ?? false}>
			{props.children}
		</RouterLink>
	)
})
