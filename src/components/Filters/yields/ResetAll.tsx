import { useRouter } from 'next/router'
import styled from 'styled-components'

export function ResetAllYieldFilters({
	pathname,
	variant = 'primary'
}: {
	pathname: string
	variant?: 'primary' | 'secondary'
}) {
	const router = useRouter()

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
		padding: 12px;
		border-radius: 12px;
		border: none;
		background: ${({ theme }) => (theme.mode === 'dark' ? '#22242a' : '#eaeaea')};

		:hover,
		:focus-visible {
			background: ${({ theme }) => (theme.mode === 'dark' ? '#22242a' : '#eaeaea')};
		}
	}
`
