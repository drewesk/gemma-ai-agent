import { PythonShell } from 'python-shell';
import { LLM_SCRIPT_PATH } from '../config';

/**
 * Execute the LLM Python script with the provided input and return the
 * output. This function centralises the logic for spawning the Python
 * process so that multiple callers do not need to duplicate it.
 *
 * @param input Text to send to the Python script
 */
export function runLlm(input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const options = {
      mode: 'text' as const,
      pythonOptions: ['-u'],
      scriptPath: undefined,
      args: [input]
    };
    const shell = new PythonShell(LLM_SCRIPT_PATH, options);
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