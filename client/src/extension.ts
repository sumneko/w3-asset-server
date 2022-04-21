import * as vscode from 'vscode'
import * as languageserver from './languageserver';

export function activate(context: vscode.ExtensionContext) {
    languageserver.activate(context);
}

export function deactivate() {
    languageserver.deactivate();
}
