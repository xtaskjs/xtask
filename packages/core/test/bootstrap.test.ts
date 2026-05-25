const mockBoot = vi.fn(async (startFn: () => Promise<void>) => {
  await startFn();
});

const mockLifecycle = {
  boot: mockBoot,
  useGlobalPipes: vi.fn(),
};

const mockKernelBoot = vi.fn(async () => {});
const mockKernelGetContainer = vi.fn(async () => ({ registerLifeCycleListeners: vi.fn() }));
const KernelMock = vi.fn(() => mockKernel);

const mockKernel = {
  boot: mockKernelBoot,
  getContainer: mockKernelGetContainer,
};

const mockGetKernel = vi.fn(() => mockKernel);
const mockListen = vi.fn(async () => {});

const mockApp = {
  getKernel: mockGetKernel,
  listen: mockListen,
};

const registerEventHandlers = vi.fn();
const registerContainerInLifecycle = vi.fn(async (_kernel?: any, _lifecycle?: any) => {});
const createHttpAdapter = vi.fn((_adapter?: any, _adapterInstance?: any) => ({
  type: "node-http",
  registerRequestHandler: vi.fn(),
  listen: vi.fn(async () => {}),
  close: vi.fn(async () => {}),
}));

vi.mock("../src/server/application-lifecycle", () => ({
  ApplicationLifeCycle: vi.fn(() => mockLifecycle),
}));

vi.mock("../src/kernel/kernel", () => ({
  Kernel: function (...args: any[]) {
    return KernelMock.apply(null, args as any);
  },
}));

vi.mock("../src/kernel/kernellisteners", () => ({
  KernelListeners: vi.fn(() => ({})),
}));

vi.mock("../src/server/registereventhandlers", () => ({
  registerEventHandlers: (...args: any[]) => registerEventHandlers(...args),
}));

vi.mock("../src/http", () => ({
  createHttpAdapter: (adapter: any, adapterInstance: any) =>
    createHttpAdapter(adapter, adapterInstance),
  registerContainerInLifecycle: (kernel: any, lifecycle: any) =>
    registerContainerInLifecycle(kernel, lifecycle),
  XTaskHttpApplication: vi.fn(() => mockApp),
}));

import { Bootstrap, CreateApplication } from "../src/bootstrap";

describe("bootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create application and return kernel from Bootstrap", async () => {
    const kernel = await Bootstrap();

    expect(kernel).toBe(mockKernel);
    expect(mockGetKernel).toHaveBeenCalledTimes(1);
  });

  it("should build app and skip listen by default", async () => {
    const app = await CreateApplication();

    expect(app).toBe(mockApp);
    expect(mockLifecycle.useGlobalPipes).toHaveBeenCalledTimes(1);
    expect(registerEventHandlers).toHaveBeenCalledTimes(1);
    expect(mockKernelBoot).toHaveBeenCalledTimes(1);
    expect(KernelMock).toHaveBeenCalledWith({
      containerOptions: undefined,
      prebuiltManifest: undefined,
      hotManifestWatcher: undefined,
    });
    expect(registerContainerInLifecycle).toHaveBeenCalledTimes(1);
    expect(createHttpAdapter).toHaveBeenCalledWith(undefined, undefined);
    expect(mockListen).not.toHaveBeenCalled();
  });

  it("should pass container options to kernel", async () => {
    await CreateApplication({
      container: {
        resolutionStrategy: "eager",
        metricsEnabled: true,
      },
    });

    expect(KernelMock).toHaveBeenCalledWith({
      containerOptions: {
        resolutionStrategy: "eager",
        metricsEnabled: true,
      },
      prebuiltManifest: undefined,
      hotManifestWatcher: undefined,
    });
  });

  it("should pass logger options to kernel container options", async () => {
    await CreateApplication({
      logger: {
        appName: "MyApp",
        useColors: false,
        file: {
          enabled: true,
          path: "./logs/app.log",
        },
      },
    });

    expect(KernelMock).toHaveBeenCalledWith({
      containerOptions: {
        logger: {
          appName: "MyApp",
          useColors: false,
          file: {
            enabled: true,
            path: "./logs/app.log",
          },
        },
      },
      prebuiltManifest: undefined,
      hotManifestWatcher: undefined,
    });
  });

  it("should pass prebuilt manifest options to kernel", async () => {
    await CreateApplication({
      prebuiltManifest: {
        enabled: true,
      },
    });

    expect(KernelMock).toHaveBeenCalledWith({
      containerOptions: undefined,
      prebuiltManifest: {
        enabled: true,
      },
      hotManifestWatcher: undefined,
    });
  });

  it("should pass hot manifest watcher options to kernel", async () => {
    await CreateApplication({
      hotManifestWatcher: {
        enabled: true,
        debounceMs: 75,
      },
    });

    expect(KernelMock).toHaveBeenCalledWith({
      containerOptions: undefined,
      prebuiltManifest: undefined,
      hotManifestWatcher: {
        enabled: true,
        debounceMs: 75,
      },
    });
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
