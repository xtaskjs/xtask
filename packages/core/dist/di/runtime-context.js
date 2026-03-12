"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentContainer = exports.clearCurrentContainer = exports.setCurrentContainer = void 0;
let currentContainer;
const setCurrentContainer = (container) => {
    currentContainer = container;
};
exports.setCurrentContainer = setCurrentContainer;
const clearCurrentContainer = () => {
    currentContainer = undefined;
};
exports.clearCurrentContainer = clearCurrentContainer;
const getCurrentContainer = () => {
    return currentContainer;
};
exports.getCurrentContainer = getCurrentContainer;
