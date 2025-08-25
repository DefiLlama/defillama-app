import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Attribute } from './Attribute'
import { BackingType } from './BackingType'
import { McapRange } from './McapRange'
import { PegType } from './PegType'
import { ResetAllStablecoinFilters } from './ResetAll'

export function PeggedFiltersDropdowns({
	pathname,
	nestedMenu,
	downloadCsv,
	isDownloadLoading
}: {
	pathname: string
	nestedMenu?: boolean
	downloadCsv: () => void
	isDownloadLoading?: boolean
}) {
	return (
		<>
			<Attribute pathname={pathname} nestedMenu={nestedMenu} />
			<BackingType pathname={pathname} nestedMenu={nestedMenu} />
			<PegType pathname={pathname} nestedMenu={nestedMenu} />
			<McapRange nestedMenu={nestedMenu} placement="bottom-start" />
			<ResetAllStablecoinFilters pathname={pathname} nestedMenu={nestedMenu} />
			<CSVDownloadButton onClick={downloadCsv} isLoading={isDownloadLoading} smol className="ml-auto" />
		</>
	)
}
