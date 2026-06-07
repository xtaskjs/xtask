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
exports.SampleMcpServer = void 0;
const core_1 = require("@xtaskjs/core");
const mcp_1 = require("@xtaskjs/mcp");
let SampleMcpServer = class SampleMcpServer {
    startedAt = new Date().toISOString();
    onStart() {
        console.log("[mcp] xtask-sample started");
    }
    onStop() {
        console.log("[mcp] xtask-sample stopped");
    }
    echo(payload) {
        return {
            ok: true,
            payload,
            handledAt: new Date().toISOString(),
        };
    }
    sum(input) {
        const values = Array.isArray(input?.values)
            ? input.values.filter((value) => typeof value === "number" && Number.isFinite(value))
            : [];
        const total = values.reduce((acc, current) => acc + current, 0);
        return {
            total,
            count: values.length,
        };
    }
    statusPrompt(input) {
        const audience = input?.audience || "operator";
        return `Prepare a short operational status update for ${audience}.`;
    }
    runtimeStatus() {
        return {
            service: "xtask-sample",
            startedAt: this.startedAt,
            now: new Date().toISOString(),
            healthy: true,
        };
    }
};
exports.SampleMcpServer = SampleMcpServer;
__decorate([
    (0, mcp_1.OnMcpServerStart)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SampleMcpServer.prototype, "onStart", null);
__decorate([
    (0, mcp_1.OnMcpServerStop)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SampleMcpServer.prototype, "onStop", null);
__decorate([
    (0, mcp_1.McpTool)("echo", {
        description: "Echo back any payload as structured JSON",
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SampleMcpServer.prototype, "echo", null);
__decorate([
    (0, mcp_1.McpTool)("sum", {
        description: "Calculate the sum of numeric values",
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SampleMcpServer.prototype, "sum", null);
__decorate([
    (0, mcp_1.McpPrompt)("status", {
        description: "Return a reusable prompt with runtime status context",
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SampleMcpServer.prototype, "statusPrompt", null);
__decorate([
    (0, mcp_1.McpResource)("resource://xtask/status", {
        name: "runtime-status",
        description: "Current runtime status snapshot",
        mimeType: "application/json",
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SampleMcpServer.prototype, "runtimeStatus", null);
exports.SampleMcpServer = SampleMcpServer = __decorate([
    (0, core_1.Service)(),
    (0, mcp_1.McpServer)({
        name: "xtask-sample",
        version: "1.0.0",
        instructions: "Demo MCP server built from @xtaskjs/mcp decorators",
        group: ["demo", "mcp"],
    })
], SampleMcpServer);
