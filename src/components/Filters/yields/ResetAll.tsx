import { useRouter } from 'next/router'
import styled from 'styled-components'
import { MenuItem } from '~/components/SlidingMenu'

export function ResetAllYieldFilters({
	pathname,
	variant = 'primary',
	subMenu
}: {
	pathname: string
	variant?: 'primary' | 'secondary'
	subMenu?: boolean
}) {
	const router = useRouter()

	if (subMenu) {
		return (
			<MenuItem
				label="Reset all filters"
				onClick={() => {
					router.push(pathname, undefined, { shallow: true })
				}}
			/>
		)
	}

	return (
		<Wrapper
			onClick={() => {
				router.push(pathname, undefined, { shallow: true })
			}}
			data-variant={variant}
		>
			Reset all filters
		</Wrapper>
	)
}

const Wrapper = styled.button`
	text-decoration: underline;

	&[data-variant='secondary'] {
		padding: 8px 12px;
		border-radius: 8px;
		border: none;
		background: ${({ theme }) => (theme.mode === 'dark' ? '#22242a' : '#eaeaea')};
		text-decoration: none;
		font-size: 0.75rem;

		:hover,
		:focus-visible {
			background: ${({ theme }) => (theme.mode === 'dark' ? '#22242a' : '#eaeaea')};
		}
	}
`
