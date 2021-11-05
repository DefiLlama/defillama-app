import { useMemo } from 'react'
import { useMedia } from 'react-use'
import { withRouter } from 'react-router-dom'

import DropdownSelect from 'components/DropdownSelect'
import FiltersAndDropdown from 'components/Filters/FiltersAndDropdown'
import Row from 'components/Row'

import { sm } from 'constants/breakpoints'

// filter option to, and label,
const Filters = ({
  filterOptions = [],
  activeLabel,
  setActive,
  priorityFilters = [],
  areLinks = true,
  history,
  onFilterClick
}) => {
  const orderedFilterOptions = useMemo(
    () => [...priorityFilters, ...filterOptions.filter(({ label }) => !priorityFilters.includes(label))],
    [filterOptions, priorityFilters]
  )

  const belowSmallTablet = useMedia(`(max-width: ${sm}px)`)
  const dropdownHandler = areLinks
    ? selectedLabel => {
        history.push(setActive(selectedLabel))
      }
    : setActive

  return (
    <Row>
      {belowSmallTablet ? (
        <DropdownSelect options={orderedFilterOptions} active={activeLabel} setActive={dropdownHandler} />
      ) : (
        <FiltersAndDropdown
          filterOptions={orderedFilterOptions}
          areLinks={areLinks}
          setActive={dropdownHandler}
          onFilterClick={onFilterClick}
        />
      )}
    </Row>
  )
}
export default withRouter(Filters)
