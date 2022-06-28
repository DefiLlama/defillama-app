import { TYPE } from '~/Theme'

interface IProps {
	title: string
}

export default function PageHeader({ title }: IProps) {
	return <TYPE.largeHeader>{title}</TYPE.largeHeader>
}
