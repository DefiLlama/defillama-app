import { ComponentProps } from 'react'
import { useInView, defaultFallbackInView } from 'react-intersection-observer'
import styled from 'styled-components'
import { ButtonLight } from '~/components/ButtonStyled'

export const Button = ({ children, ...props }: ComponentProps<typeof ButtonLight>) => (
	<ButtonLight className="flex items-center gap-4 font-normal whitespace-nowrap font-inter" {...props}>
		{children}
	</ButtonLight>
)

export const DownloadButton = ({ children, ...props }: ComponentProps<typeof ButtonLight>) => (
	<ButtonLight
		className="flex items-center gap-4 font-normal whitespace-nowrap font-inter !text-inherit rounded-xl"
		{...props}
	>
		{children}
	</ButtonLight>
)

export const ChartWrapper = styled.div`
	grid-column: span 2;
	min-height: 400px;
	padding: 20px;
	display: flex;
	flex-direction: column;

	@media screen and (min-width: 80rem) {
		grid-column: span 1;

		:last-child:nth-child(2n - 1) {
			grid-column: span 2;
		}
	}
`

defaultFallbackInView(true)

export const LazyChart = ({ children, enable = true, ...props }) => {
	const { ref, inView } = useInView({
		triggerOnce: true
	})

	return enable ? (
		<ChartWrapper ref={ref} {...props}>
			{inView && children}
		</ChartWrapper>
	) : (
		children
	)
}
