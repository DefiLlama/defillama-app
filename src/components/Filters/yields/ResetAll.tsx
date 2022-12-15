import { useRouter } from 'next/router'
import styled from 'styled-components'
import { MenuItem } from '~/components/SlidingMenu'

export function ResetAllYieldFilters({
	pathname,
	variant = 'primary',
	subMenu,
	resetContext
}: {
	pathname: string
	variant?: 'primary' | 'secondary'
	subMenu?: boolean
	resetContext?: () => void
}) {
	const router = useRouter()

	const handleClick = () => {
		router.push(pathname, undefined, { shallow: true })
		resetContext?.()
	}

	if (subMenu) {
		return <MenuItem label="Reset all filters" onClick={handleClick} />
	}

	return (
		<Wrapper onClick={handleClick} data-variant={variant}>
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
