import * as React from 'react'
import styled from 'styled-components'

export default function SortIcon({ dir }: { dir: string | boolean }) {
	return (
		<Wrapper>
			<Caret role="img" aria-label="caret-up" active={dir === 'asc'}>
				<svg
					viewBox="0 0 1024 1024"
					width="10px"
					focusable="false"
					data-icon="caret-up"
					fill="currentColor"
					aria-hidden="true"
				>
					<path d="M858.9 689L530.5 308.2c-9.4-10.9-27.5-10.9-37 0L165.1 689c-12.2 14.2-1.2 35 18.5 35h656.8c19.7 0 30.7-20.8 18.5-35z"></path>
				</svg>
			</Caret>
			<Caret role="img" aria-label="caret-down" active={dir === 'desc'}>
				<svg
					viewBox="0 0 1024 1024"
					width="10px"
					focusable="false"
					data-icon="caret-down"
					fill="currentColor"
					aria-hidden="true"
				>
					<path d="M840.4 300H183.6c-19.7 0-30.7 20.8-18.5 35l328.4 380.8c9.4 10.9 27.5 10.9 37 0L858.9 335c12.2-14.2 1.2-35-18.5-35z"></path>
				</svg>
			</Caret>
		</Wrapper>
	)
}

const Wrapper = styled.span`
	display: flex;
	flex-direction: column;
	flex-shrink: 0;
	position: relative;
	top: 1px;
`

interface ICaret {
	active: boolean
}

const Caret = styled.span<ICaret>`
	color: ${({ active, theme }) => (active ? theme.blue : 'gray')};
	flex-shrink: 0;
	position: relative;

	:first-of-type {
		top: 2px;
	}

	:last-of-type {
		bottom: 2px;
	}
`
