import FiltersAndDropdown from './FiltersAndDropdown'
import Row from '../Row'

// filter option to, and label,
const Filters = ({ filterOptions = [], activeLabel, areLinks = true, onFilterClick, justify }) => {
  return (
    <Row justify={justify}>
      <FiltersAndDropdown
        filterOptions={filterOptions}
        areLinks={areLinks}
        onFilterClick={onFilterClick}
        activeLabel={activeLabel}
      />
    </Row>
  )
}
export default Filters
