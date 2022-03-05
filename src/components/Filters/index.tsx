import FiltersAndDropdown from './FiltersAndDropdown'
import Row from '../Row'

interface IFilterOption {
  label: string
  to: string
}

interface FiltersProps {
  filterOptions: IFilterOption[]
  activeLabel: string
  areLinks?: boolean
  onFilterClick?: () => void
  justify?: string
}

// filter option to, and label,
const Filters = ({ filterOptions = [], activeLabel, areLinks = true, onFilterClick, justify }: FiltersProps) => {
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
