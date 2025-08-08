#!/usr/bin/env python3
"""
Simple LLM service with optional Ollama integration.

This script accepts a single argument (some text) and prints a
language‑model response to stdout. If the `OLLAMA_URL` environment
variable is defined, it will call a locally running Ollama server via
its HTTP API, using the model specified in `OLLAMA_MODEL`. When
Ollama is unavailable or the call fails, the script falls back to a
stub implementation that truncates the input and prefixes it with
`"LLM output: "`. This makes it useful in both development and
production scenarios.
"""
import sys
import json
import os
import urllib.request
import urllib.error


def call_ollama_api(prompt: str) -> str:
    """
    Call a local ollama service via its HTTP API and return the model
    response. The function uses environment variables OLLAMA_URL and
    OLLAMA_MODEL to configure the API endpoint and model. If the call
    fails, an exception is raised.
    """
    url = os.environ.get('OLLAMA_URL', 'http://localhost:11434/api/generate')
    model = os.environ.get('OLLAMA_MODEL', 'llama3')
    payload = {
        'model': model,
        'prompt': prompt,
        'stream': False
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, method='POST',
                                 headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=60) as resp:
        resp_data = resp.read().decode('utf-8')
    parsed = json.loads(resp_data)
    # The response field typically contains the generated text
    return parsed.get('response') or ''


def generate_response(prompt: str) -> str:
    """
    Generate a response for the provided prompt. When an ollama service is
    available (via OLLAMA_URL), this function will call the service and
    return its output. If the call fails or the service is not
    configured, the function falls back to a simple stubbed response
    that truncates the input and prefixes it with a label.
    """
    # Attempt to call ollama if configured
    try:
        if os.environ.get('OLLAMA_URL'):
            result = call_ollama_api(prompt)
            # Prefix with a label to maintain compatibility with existing tests
            return f"LLM output: {result}"
    except Exception as ex:
        # Log the error to stderr for visibility and fall back
        print(f"Ollama call failed: {ex}", file=sys.stderr)
    # Fall back to stubbed behaviour: truncate input and prefix
    excerpt = prompt.strip()[:200]
    return f"LLM output: {excerpt}..."


def main() -> None:
    if len(sys.argv) < 2:
        print("Error: missing input text", file=sys.stderr)
        sys.exit(1)
    prompt = sys.argv[1]
    result = generate_response(prompt)
    # Print the result; PythonShell in Node will capture this
    print(result)


if __name__ == '__main__':
    main()