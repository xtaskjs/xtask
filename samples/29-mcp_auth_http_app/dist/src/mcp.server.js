"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthSampleMcpServer = void 0;
const core_1 = require("@xtaskjs/core");
const mcp_1 = require("@xtaskjs/mcp");
let AuthSampleMcpServer = class AuthSampleMcpServer {
    whoami() {
        return {
            service: "xtask-auth-sample",
            role: "authenticated-client",
            timestamp: new Date().toISOString(),
        };
    }
    authStatus() {
        return {
            authRequired: true,
            now: new Date().toISOString(),
        };
    }
};
exports.AuthSampleMcpServer = AuthSampleMcpServer;
__decorate([
    (0, mcp_1.McpTool)("whoami", {
        description: "Returns a static identity payload",
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AuthSampleMcpServer.prototype, "whoami", null);
__decorate([
    (0, mcp_1.McpResource)("resource://auth/status", {
        name: "auth-status",
        mimeType: "application/json",
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AuthSampleMcpServer.prototype, "authStatus", null);
exports.AuthSampleMcpServer = AuthSampleMcpServer = __decorate([
    (0, core_1.Service)(),
    (0, mcp_1.McpServer)({
        name: "xtask-auth-sample",
        version: "1.0.0",
        instructions: "Authenticated MCP sample server",
        group: ["auth", "mcp"],
    })
], AuthSampleMcpServer);
