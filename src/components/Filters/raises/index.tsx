import { DropdownsWrapper, Header, Wrapper } from '../v2Base'
import { useMedia } from '~/hooks/useMedia'
import { SlidingMenu } from '~/components/SlidingMenu'
import { RaisesFilterDropdowns } from './Dropdowns'
import { IDropdownMenusProps } from './types'
import { RaisesSearch } from '~/components/Search/Raises'

export function RaisesFilters(props: IDropdownMenusProps) {
	const isSmall = useMedia(`(max-width: 30rem)`)

	return (
		<div>
			<Header>
				<h1>{props.header}</h1>
			</Header>
			<Wrapper>
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
