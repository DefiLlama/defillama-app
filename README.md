# DefiLlama

Check it out live: [https://defillama.com](https://defillama.com)

### To Start Development

###### Installing dependencies

```bash
yarn
```

###### Running locally

```bash
yarn dev
```

### Updating API docs

1. Get the API spec in /docs/spec.yaml and paste it into https://editor.swagger.io/
2. Modify it
3. Generate a json file by clicking "File" -> "Convert and save as JSON"
4. Copy the generated json file along with the changed yml spec into this repo

At the end you should have modified both `/docs/spec.yaml` and `/docs/resolvedSpec.json`
