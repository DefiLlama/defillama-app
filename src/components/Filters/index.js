import { useMedia } from 'react-use'

import DropdownSelect from '../DropdownSelect'
import FiltersAndDropdown from '../Filters/FiltersAndDropdown'
import Row from '../Row'

import { sm } from 'constants/breakpoints'

// filter option to, and label,
const Filters = ({ filterOptions = [], activeLabel, areLinks = true, onFilterClick, justify }) => {
  const belowSmallTablet = useMedia(`(max-width: ${sm}px)`)

  return (
    <Row justify={justify}>
      {belowSmallTablet ? (
        <DropdownSelect
          options={filterOptions}
          active={activeLabel}
        />
      ) : (
        <FiltersAndDropdown
          filterOptions={filterOptions}
          areLinks={areLinks}
          onFilterClick={onFilterClick}
          activeLabel={activeLabel}
        />
      )}
    </Row>
  )
}
export default Filters
