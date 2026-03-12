"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.view = void 0;
const view = (template, model, statusCode) => ({
    __xtaskView: true,
    template,
    model,
    statusCode,
});
exports.view = view;
