import unittest
import sys
import os

# Add the backend directory to the Python path so we can import llm_service
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.abspath(os.path.join(BACKEND_DIR, '..'))
sys.path.insert(0, BACKEND_ROOT)

from llm_service import generate_response


class TestLLMService(unittest.TestCase):
    def test_generate_response_prepends_output_label(self):
        text = "This is a test string that will be truncated by the service."
        result = generate_response(text)
        self.assertTrue(result.startswith("LLM output: "))
        # Ensure the excerpt is truncated to around 200 chars (plus label)
        self.assertTrue(len(result) <= len("LLM output: ") + 203)


if __name__ == '__main__':
    unittest.main()