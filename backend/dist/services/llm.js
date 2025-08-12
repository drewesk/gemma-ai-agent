"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runLlm = runLlm;
const python_shell_1 = require("python-shell");
const path_1 = __importDefault(require("path"));
/**
 * Executes the llm_service.py script with the provided input and returns
 * the resulting output. The Python script should print the result to stdout.
 *
 * @param input Text to send to the LLM service
 */
function runLlm(input) {
    return new Promise((resolve, reject) => {
        const scriptPath = path_1.default.resolve(__dirname, '../../llm_service.py');
        const options = {
            mode: 'text',
            pythonOptions: ['-u'],
            scriptPath: undefined, // specify full path rather than scriptPath
            args: [input]
        };
        const shell = new python_shell_1.PythonShell(scriptPath, options);
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
