const mockBoot = jest.fn(async (startFn: () => Promise<void>) => {
  await startFn();
});

const mockLifecycle = {
  boot: mockBoot,
};

const mockKernelBoot = jest.fn(async () => {});
const mockKernelGetContainer = jest.fn(async () => ({ registerLifeCycleListeners: jest.fn() }));

const mockKernel = {
  boot: mockKernelBoot,
  getContainer: mockKernelGetContainer,
};

const mockGetKernel = jest.fn(() => mockKernel);
const mockListen = jest.fn(async () => {});

const mockApp = {
  getKernel: mockGetKernel,
  listen: mockListen,
};

const registerEventHandlers = jest.fn();
const registerContainerInLifecycle = jest.fn(async (_kernel?: any, _lifecycle?: any) => {});
const createHttpAdapter = jest.fn((_adapter?: any, _adapterInstance?: any) => ({
  type: "node-http",
  registerRequestHandler: jest.fn(),
  listen: jest.fn(async () => {}),
  close: jest.fn(async () => {}),
}));

jest.mock("../src/server/application-lifecycle", () => ({
  ApplicationLifeCycle: jest.fn(() => mockLifecycle),
}));

jest.mock("../src/kernel/kernel", () => ({
  Kernel: jest.fn(() => mockKernel),
}));

jest.mock("../src/kernel/kernellisteners", () => ({
  KernelListeners: jest.fn(() => ({})),
}));

jest.mock("../src/server/registereventhandlers", () => ({
  registerEventHandlers: (...args: any[]) => registerEventHandlers(...args),
}));

jest.mock("../src/http", () => ({
  createHttpAdapter: (adapter: any, adapterInstance: any) =>
    createHttpAdapter(adapter, adapterInstance),
  registerContainerInLifecycle: (kernel: any, lifecycle: any) =>
    registerContainerInLifecycle(kernel, lifecycle),
  XTaskHttpApplication: jest.fn(() => mockApp),
}));

import { Bootstrap, CreateApplication } from "../src/bootstrap";

describe("bootstrap", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create application and return kernel from Bootstrap", async () => {
    const kernel = await Bootstrap();

    expect(kernel).toBe(mockKernel);
    expect(mockGetKernel).toHaveBeenCalledTimes(1);
  });

  it("should build app and skip listen by default", async () => {
    const app = await CreateApplication();

    expect(app).toBe(mockApp);
    expect(registerEventHandlers).toHaveBeenCalledTimes(1);
    expect(mockKernelBoot).toHaveBeenCalledTimes(1);
    expect(registerContainerInLifecycle).toHaveBeenCalledTimes(1);
    expect(createHttpAdapter).toHaveBeenCalledWith(undefined, undefined);
    expect(mockListen).not.toHaveBeenCalled();
  });

  it("should call listen when autoListen is enabled", async () => {
    await CreateApplication({
      adapter: "node-http",
      autoListen: true,
      server: { host: "127.0.0.1", port: 4000 },
    });

    expect(mockListen).toHaveBeenCalledWith({ host: "127.0.0.1", port: 4000 });
  });
});
