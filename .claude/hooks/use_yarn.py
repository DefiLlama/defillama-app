#!/usr/bin/env python3
import json
import sys
import re
from pathlib import Path

def main():
    try:
        # Read input data from stdin
        input_data = json.load(sys.stdin)
        # tool_name = input_data.get("tool_name")
        tool_input = input_data.get("tool_input", {})
        command = tool_input.get("command", "")
        
        if not command:
            sys.exit(0)
        
        # Check for npm, bun, pnpm commands and npx/bunx commands
        npm_pattern = r"\bnpm\s+"
        npx_pattern = r"\bnpx\s+"
        bun_pattern = r"\bbun\s+"
        bunx_pattern = r"\bbunx\s+"
        pnpm_pattern = r"\bpnpm\s+"
        
        blocked_command = None
        suggested_command = None
        
        if re.search(npm_pattern, command):
            blocked_command = command
            suggested_command = re.sub(r"\bnpm\b", "yarn", command)
        elif re.search(npx_pattern, command):
            blocked_command = command
            suggested_command = re.sub(r"\bnpx\b", "yarn dlx", command)
        elif re.search(bun_pattern, command):
            blocked_command = command
            suggested_command = re.sub(r"\bbun\b", "yarn", command)
        elif re.search(bunx_pattern, command):
            blocked_command = command
            suggested_command = re.sub(r"\bbunx\b", "yarn dlx", command)
        elif re.search(pnpm_pattern, command):
            blocked_command = command
            suggested_command = re.sub(r"\bpnpm\b", "yarn", command)
        
        if blocked_command:
            # Log the usage attempt
            log_file = Path(__file__).parent.parent / "yarn_enforcement.json"
            log_entry = {
                "session_id": input_data.get("session_id"),
                "blocked_command": blocked_command,
                "suggested_command": suggested_command,
            }
            
            # Load existing logs or create new list
            if log_file.exists():
                with open(log_file, "r") as f:
                    logs = json.load(f)
            else:
                logs = []
            
            logs.append(log_entry)
            
            # Save logs
            with open(log_file, "w") as f:
                json.dump(logs, f, indent=2)
            
            # Send error message to stderr for LLM to see
            print("Error: Use 'yarn/yarn dlx' instead of 'npm/npx/bun/bunx/pnpm'", file=sys.stderr)
            
            # Exit with code 2 to signal LLM to correct
            sys.exit(2)
    
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON input: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error in use-yarn hook: {e}", file=sys.stderr)
        sys.exit(1)

main()