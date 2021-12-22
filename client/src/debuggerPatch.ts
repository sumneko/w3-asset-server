import * as vscode from "vscode";
import * as fs from "fs"

export async function applyPatch(context: vscode.ExtensionContext) {
    let debug = vscode.extensions.getExtension('actboy168.lua-debug');
    if (!debug) {
        return;
    }
    let myPath    = context.extensionPath;
    let debugPath = debug.extensionPath;
    await fs.promises.copyFile(myPath + "/patch/remotedebug.dll",   debugPath + "/runtime/win32-x64/lua51/remotedebug.dll");
    await fs.promises.copyFile(myPath + "/patch/worker.lua",        debugPath + "/script/backend/worker.lua");
    await fs.promises.copyFile(myPath + "/patch/query_process.lua", debugPath + "/script/frontend/query_process.lua");
    await fs.promises.copyFile(myPath + "/patch/trackerFactory.js", debugPath + "/js/trackerFactory.js");
}
