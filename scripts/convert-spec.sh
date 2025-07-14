#!/bin/bash

# Convert YAML spec files to JSON using Python
# This is an alternative to the Node.js script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCS_DIR="$SCRIPT_DIR/../src/docs"

echo "Converting YAML spec files to JSON..."

# Function to convert YAML to JSON using Python
convert_yaml_to_json() {
    local yaml_file="$1"
    local json_file="$2"
    
    echo "Converting $yaml_file to $json_file..."
    
    python3 -c "
import yaml
import json
import sys

try:
    with open('$yaml_file', 'r') as f:
        data = yaml.safe_load(f)
    
    with open('$json_file', 'w') as f:
        json.dump(data, f, indent='\t')
    
    print('✅ Successfully converted $yaml_file to $json_file')
except Exception as e:
    print(f'❌ Error converting $yaml_file: {e}', file=sys.stderr)
    sys.exit(1)
"
}

# Convert main spec files
convert_yaml_to_json "$DOCS_DIR/spec.yaml" "$DOCS_DIR/resolvedSpec.json"
convert_yaml_to_json "$DOCS_DIR/proSpec.yaml" "$DOCS_DIR/proSpec.json"

echo "🎉 All spec files converted successfully!" 