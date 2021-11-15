import { useMedia } from 'react-use'
import { useRouter } from 'next/router'

import DropdownSelect from '../DropdownSelect'
import FiltersAndDropdown from '../Filters/FiltersAndDropdown'
import Row from '../Row'

import { sm } from 'constants/breakpoints'

// filter option to, and label,
const Filters = ({ filterOptions = [], activeLabel, setActive, areLinks = true, history, onFilterClick, justify }) => {
  const router = useRouter()
  const belowSmallTablet = useMedia(`(max-width: ${sm}px)`)
  const dropdownHandler = areLinks
    ? selectedLabel => {
      router.push(setActive(selectedLabel))
    }
    : setActive

  return (
    <Row justify={justify}>
      {belowSmallTablet ? (
        <DropdownSelect
          options={filterOptions.map(({ label }) => label)}
          active={activeLabel}
          setActive={dropdownHandler}
        />
      ) : (
        <FiltersAndDropdown
          filterOptions={filterOptions}
          areLinks={areLinks}
          setActive={dropdownHandler}
          onFilterClick={onFilterClick}
          activeLabel={activeLabel}
        />
      )}
    </Row>
  )
}
export default Filters
