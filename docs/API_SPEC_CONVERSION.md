# API Spec Conversion Guide

This document explains how to update the API specification files in the DefiLlama project.

## Overview

The project uses OpenAPI specifications in both YAML and JSON formats:

- `src/docs/spec.yaml` - Main API specification in YAML format
- `src/docs/resolvedSpec.json` - Converted JSON version for the frontend
- `src/docs/proSpec.yaml` - Pro API specification in YAML format
- `src/docs/proSpec.json` - Converted JSON version for the pro API frontend

## Automated Conversion (Recommended)

### Prerequisites

- Node.js and Yarn installed
- `js-yaml` dependency (already included in the project)

### Steps

1. **Edit the YAML files**: Modify either `spec.yaml` or `proSpec.yaml` as needed
2. **Run the conversion script**:
   ```bash
   yarn convert-spec
   ```
3. **Verify the changes**: Check that the corresponding JSON files have been updated

### What the script does

The `scripts/convert-spec.js` script:

- Reads the YAML files using the `js-yaml` library
- Converts them to JavaScript objects
- Formats the output as JSON with proper indentation
- Writes the results to the corresponding JSON files

## Manual Conversion (Alternative)

If you prefer to use external tools:

### Using Swagger Editor

1. Open https://editor.swagger.io/
2. Copy the content from `src/docs/spec.yaml`
3. Make your modifications
4. Go to "File" → "Convert and save as JSON"
5. Save the generated JSON as `src/docs/resolvedSpec.json`

### Using Command Line Tools

#### With Python (if available)

```bash
python3 -c "
import yaml
import json
with open('src/docs/spec.yaml', 'r') as f:
    data = yaml.safe_load(f)
with open('src/docs/resolvedSpec.json', 'w') as f:
    json.dump(data, f, indent='\t')
"
```

#### With yq (if installed)

```bash
yq eval -o=json src/docs/spec.yaml > src/docs/resolvedSpec.json
```

## File Structure

```
src/docs/
├── spec.yaml          # Main API spec (YAML)
├── resolvedSpec.json  # Main API spec (JSON) - auto-generated
├── proSpec.yaml       # Pro API spec (YAML)
└── proSpec.json       # Pro API spec (JSON) - auto-generated
```

## Usage in the Application

The JSON files are imported and used in the frontend:

```typescript
// In src/pages/docs/api.tsx
import yamlApiSpec from '~/docs/resolvedSpec.json'

// In src/pages/pro-api/docs.tsx
import yamlApiSpec from '~/docs/proSpec.json'
```

## Best Practices

1. **Always edit the YAML files first** - They are the source of truth
2. **Run the conversion script after any YAML changes** - This ensures the JSON files stay in sync
3. **Use the automated method** - It's faster and less error-prone than manual conversion
4. **Test your changes** - Make sure the API documentation still renders correctly after conversion

## Troubleshooting

### Common Issues

1. **Conversion fails with YAML syntax errors**

   - Check your YAML syntax using a YAML validator
   - Ensure proper indentation and formatting

2. **JSON file not updated**

   - Make sure you're editing the correct YAML file
   - Verify the conversion script ran successfully

3. **Frontend not showing updated docs**
   - Clear your browser cache
   - Restart the development server

### Getting Help

If you encounter issues:

1. Check the console output from the conversion script
2. Verify the YAML syntax is valid
3. Ensure all dependencies are installed (`yarn install`)
4. Check that the file paths are correct for your system
