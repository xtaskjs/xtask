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
exports.KernelListeners = void 0;
require("reflect-metadata");
const common_1 = require("@xtaskjs/common");
// Clase que escucha eventos del ciclo de vida
class KernelListeners {
    constructor() {
        this.showMetricsLogs = process.env.XTASKJS_SHOW_METRICS_LOGS === "true";
    }
    writeLog(...args) {
        if (process.env.NODE_ENV !== "test") {
            console.log(...args);
        }
    }
    onStarting() {
        this.writeLog("[Lifecycle] Starting...");
    }
    onReady() {
        this.writeLog("[Lifecycle] Application ready!");
    }
    async afterStart() {
        this.writeLog("[Runner] ApplicationRunner ejecutado después de arrancar Kernel");
    }
    async cli(args) {
        this.writeLog("[Runner] CommandLineRunner con args:", args);
    }
    memory(mem) {
        if (!this.showMetricsLogs) {
            return;
        }
        this.writeLog("[Metrics] Heap MB:", (mem.heapUsed / 1024 / 1024).toFixed(2));
    }
    cpu(calc) {
        if (!this.showMetricsLogs) {
            return;
        }
        this.writeLog("CPU", (calc));
    }
}
exports.KernelListeners = KernelListeners;
__decorate([
    (0, common_1.OnEvent)("starting"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], KernelListeners.prototype, "onStarting", null);
__decorate([
    (0, common_1.OnEvent)("ready"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], KernelListeners.prototype, "onReady", null);
__decorate([
    (0, common_1.ApplicationRunner)(5),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], KernelListeners.prototype, "afterStart", null);
__decorate([
    (0, common_1.CommandLineRunner)(0),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", Promise)
], KernelListeners.prototype, "cli", null);
__decorate([
    (0, common_1.OnEvent)("memoryReport"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], KernelListeners.prototype, "memory", null);
__decorate([
    (0, common_1.OnEvent)("cpuReport"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], KernelListeners.prototype, "cpu", null);
