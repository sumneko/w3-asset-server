"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const path = require("path");
const os = require("os");
const vscode_1 = require("vscode");
const node_1 = require("vscode-languageclient/node");
let defaultClient;
let clients = new Map();
let _sortedWorkspaceFolders;
function sortedWorkspaceFolders() {
    if (_sortedWorkspaceFolders === void 0) {
        _sortedWorkspaceFolders = vscode_1.workspace.workspaceFolders ? vscode_1.workspace.workspaceFolders.map(folder => {
            let result = folder.uri.toString();
            if (result.charAt(result.length - 1) !== '/') {
                result = result + '/';
            }
            return result;
        }).sort((a, b) => {
            return a.length - b.length;
        }) : [];
    }
    return _sortedWorkspaceFolders;
}
vscode_1.workspace.onDidChangeWorkspaceFolders(() => _sortedWorkspaceFolders = undefined);
function getOuterMostWorkspaceFolder(folder) {
    let sorted = sortedWorkspaceFolders();
    for (let element of sorted) {
        let uri = folder.uri.toString();
        if (uri.charAt(uri.length - 1) !== '/') {
            uri = uri + '/';
        }
        if (uri.startsWith(element)) {
            return vscode_1.workspace.getWorkspaceFolder(vscode_1.Uri.parse(element));
        }
    }
    return folder;
}
function start(context, documentSelector, folder) {
    // Options to control the language client
    let clientOptions = {
        // Register the server for plain text documents
        documentSelector: documentSelector,
        workspaceFolder: folder,
        progressOnInitialization: true,
        markdown: {
            isTrusted: true,
        },
    };
    let config = vscode_1.workspace.getConfiguration(undefined, folder);
    let command;
    let platform = os.platform();
    switch (platform) {
        case "win32":
            command = context.asAbsolutePath(path.join('server', 'bin', 'Windows', 'w3-asset-server.exe'));
            break;
    }
    let serverOptions = {
        command: command,
        args: [
            '-E',
            context.asAbsolutePath(path.join('server', 'main.lua'))
        ]
    };
    let client = new node_1.LanguageClient('W3-asset', 'W3-asset', serverOptions, clientOptions);
    client.registerProposedFeatures();
    client.start();
    return client;
}
function showAssetID() {
    let badgeMap = new Map();
    vscode_1.window.registerFileDecorationProvider({
        provideFileDecoration: (uri) => __awaiter(this, void 0, void 0, function* () {
            badgeMap.set(uri.toString(), true);
            if (!uri.path.toLowerCase().endsWith('.asset')) {
                badgeMap.set(uri.toString(), false);
                return;
            }
            let text = (yield vscode_1.workspace.fs.readFile(uri)).toString();
            let results = text.match(/ID:\s*(".*")/);
            if (!results) {
                badgeMap.set(uri.toString(), false);
                return;
            }
            let id = '《' + eval(results[1]) + '》';
            let fd = new vscode_1.FileDecoration();
            fd.badge = id.substr(0, 2);
            fd.tooltip = id;
            badgeMap.set(uri.toString(), id);
            return fd;
        })
    });
    function sleep(time) {
        return new Promise((resolve) => setTimeout(resolve, time));
    }
    for (let index = 1; index < 20; index++) {
        vscode_1.window.registerFileDecorationProvider({
            provideFileDecoration: (uri) => __awaiter(this, void 0, void 0, function* () {
                while (true) {
                    let badge = badgeMap.get(uri.toString());
                    if (badge === false) {
                        return;
                    }
                    if (typeof (badge) == 'string') {
                        let piece = badge.substr(index * 2, 2);
                        if (piece === '') {
                            return;
                        }
                        let fd = new vscode_1.FileDecoration();
                        fd.badge = piece;
                        return fd;
                    }
                    yield sleep(0.1);
                }
            })
        });
    }
}
function activate(context) {
    function didOpenTextDocument(document) {
        // We are only interested in language mode text
        if (document.languageId !== 'asset') {
            return;
        }
        if (!defaultClient) {
            defaultClient = start(context, [
                { language: 'asset' }
            ], null);
            return;
        }
    }
    vscode_1.workspace.onDidOpenTextDocument(didOpenTextDocument);
    vscode_1.workspace.textDocuments.forEach(didOpenTextDocument);
    showAssetID();
}
exports.activate = activate;
function deactivate() {
    let promises = [];
    if (defaultClient) {
        promises.push(defaultClient.stop());
    }
    for (let client of clients.values()) {
        promises.push(client.stop());
    }
    return Promise.all(promises).then(() => undefined);
}
exports.deactivate = deactivate;
//# sourceMappingURL=languageserver.js.map