"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runLlm = runLlm;
const python_shell_1 = require("python-shell");
const config_1 = require("../config");
/**
 * Execute the LLM Python script with the provided input and return the
 * output. This function centralises the logic for spawning the Python
 * process so that multiple callers do not need to duplicate it.
 *
 * @param input Text to send to the Python script
 */
function runLlm(input) {
    return new Promise((resolve, reject) => {
        const options = {
            mode: 'text',
            pythonOptions: ['-u'],
            scriptPath: undefined,
            args: [input]
        };
        const shell = new python_shell_1.PythonShell(config_1.LLM_SCRIPT_PATH, options);
        let output = '';
        shell.on('message', (message) => {
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
