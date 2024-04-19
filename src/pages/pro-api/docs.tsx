import yamlApiSpec from '~/docs/proSpec.json'
import 'swagger-ui/dist/swagger-ui.css'
import ApiDocs from '../docs/api'

export default function Docs() {
	return <ApiDocs spec={yamlApiSpec} />
}
