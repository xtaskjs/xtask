"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getComponentMetadata = exports.Container = exports.Component = void 0;
var component_1 = require("./component");
Object.defineProperty(exports, "Component", { enumerable: true, get: function () { return component_1.Component; } });
var container_1 = require("./container");
Object.defineProperty(exports, "Container", { enumerable: true, get: function () { return container_1.Container; } });
__exportStar(require("./lifecycle"), exports);
var component_2 = require("./component");
Object.defineProperty(exports, "getComponentMetadata", { enumerable: true, get: function () { return component_2.getComponentMetadata; } });
__exportStar(require("./stereotypes"), exports);
__exportStar(require("./autowired"), exports);
__exportStar(require("./qualifier"), exports);
__exportStar(require("./runtime-context"), exports);
