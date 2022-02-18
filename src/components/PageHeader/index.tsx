import { RowBetween } from 'components/Row'
import Search from 'components/Search'
import { useLg } from 'hooks'
import { TYPE } from 'Theme'

interface IProps {
  title: string
}

export default function PageHeader({ title }: IProps) {
  const isLg = useLg()

  return (
    <RowBetween>
      <TYPE.largeHeader>{title}</TYPE.largeHeader>
      <Search small={!isLg} />
    </RowBetween>
  )
}
