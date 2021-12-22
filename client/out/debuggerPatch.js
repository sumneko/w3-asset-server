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
exports.applyPatch = void 0;
const vscode = require("vscode");
const fs = require("fs");
function applyPatch(context) {
    return __awaiter(this, void 0, void 0, function* () {
        let debug = vscode.extensions.getExtension('actboy168.lua-debug');
        if (!debug) {
            return;
        }
        let myPath = context.extensionPath;
        let debugPath = debug.extensionPath;
        yield fs.promises.copyFile(myPath + "/patch/remotedebug.dll", debugPath + "/runtime/win32-x64/lua51/remotedebug.dll");
        yield fs.promises.copyFile(myPath + "/patch/worker.lua", debugPath + "/script/backend/worker.lua");
        yield fs.promises.copyFile(myPath + "/patch/query_process.lua", debugPath + "/script/frontend/query_process.lua");
        yield fs.promises.copyFile(myPath + "/patch/trackerFactory.js", debugPath + "/js/query_process.lua");
    });
}
exports.applyPatch = applyPatch;
//# sourceMappingURL=debuggerPatch.js.map