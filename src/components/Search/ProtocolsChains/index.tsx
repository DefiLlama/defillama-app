import { useRouter } from 'next/router'
import { DesktopSearch } from '../Base'
import { IBaseSearchProps, ICommonSearchProps, SETS } from '../types'
import { DesktopProtocolFilters, TabletProtocolsFilters } from '~/components/Filters/protocols'
import { useGetDefiSearchList } from './hooks'

interface IProtocolsChainsSearch extends ICommonSearchProps {
	includedSets?: SETS[]
	customPath?: IBaseSearchProps['customPath']
	options?: { name: string; key: string }[]
}

export default function ProtocolsChainsSearch(props: IProtocolsChainsSearch) {
	const { includedSets = Object.values(SETS), customPath, options } = props

	const { data, loading } = useGetDefiSearchList({ includedSets, customPath })

	return <DesktopSearch {...props} data={data} loading={loading} filters={<TvlOptions options={options} />} />
}

const TvlOptions = ({ options }: { options?: { name: string; key: string }[] }) => {
	const router = useRouter()

	if (router.pathname?.includes('/protocol/') && (!options || options.length === 0)) return null

	return (
		<>
			<DesktopProtocolFilters options={options} />

			<TabletProtocolsFilters options={options} />
		</>
	)
}
