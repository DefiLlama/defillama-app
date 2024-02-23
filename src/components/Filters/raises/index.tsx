import { DropdownsWrapper, Wrapper } from '../v2Base'
import { useMedia } from '~/hooks'
import { SlidingMenu } from '~/components/SlidingMenu'
import { RaisesFilterDropdowns } from './Dropdowns'
import { IDropdownMenusProps } from './types'
import { RaisesSearch } from '~/components/Search'
import { Header } from '~/Theme'

export function RaisesFilters(props: IDropdownMenusProps) {
	const isSmall = useMedia(`(max-width: 30rem)`)

	return (
		<div>
			<Header>{props.header}</Header>
			<Wrapper style={{ marginTop: '1rem' }}>
				<RaisesSearch list={props.investors || []} />

				<DropdownsWrapper>
					{isSmall ? (
						<SlidingMenu label="Filters" variant="secondary">
							<RaisesFilterDropdowns {...props} isMobile />
						</SlidingMenu>
					) : (
						<RaisesFilterDropdowns {...props} />
					)}
				</DropdownsWrapper>
			</Wrapper>
		</div>
	)
}
