"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const languageserver = require("./languageserver");
function activate(context) {
    languageserver.activate(context);
}
exports.activate = activate;
function deactivate() {
    languageserver.deactivate();
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map