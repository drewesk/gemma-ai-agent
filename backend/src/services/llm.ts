import { PythonShell } from 'python-shell';
import path from 'path';

/**
 * Executes the llm_service.py script with the provided input and returns
 * the resulting output. The Python script should print the result to stdout.
 *
 * @param input Text to send to the LLM service
 */
export function runLlm(input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(__dirname, '../../llm_service.py');
    const options = {
      mode: 'text' as const,
      pythonOptions: ['-u'],
      scriptPath: undefined, // specify full path rather than scriptPath
      args: [input]
    };
    const shell = new PythonShell(scriptPath, options);
    let output = '';
    shell.on('message', (message: string) => {
      output += message;
    });
    shell.on('error', (err) => {
      reject(err);
    });
    shell.on('close', () => {
      resolve(output);
    });
  });
}