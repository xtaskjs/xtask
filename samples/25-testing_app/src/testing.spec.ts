import "reflect-metadata";
import assert from "assert";
import { AutoWired, PostConstruct, PreDestroy, Qualifier, Service } from "@xtaskjs/core";
import { Module, Test } from "@xtaskjs/testing";

const LOGGER_TOKEN = "logger";

interface ILogger {
  write(message: string): string;
}

@Service()
class ApiClient {
  getStatus(): string {
    return "real-api";
  }
}

@Service()
class UserService {
  constructor(private readonly apiClient: ApiClient) {}

  loadStatus(): string {
    return this.apiClient.getStatus();
  }
}

@Service({ scope: "transient" })
class RequestIdService {
  private readonly requestId = Math.random().toString(16).slice(2);

  value(): string {
    return this.requestId;
  }
}

@Service()
class ReportService {
  @AutoWired()
  private readonly userService!: UserService;

  constructor(@Qualifier(LOGGER_TOKEN) private readonly logger: ILogger) {}

  build(): string {
    const line = this.userService.loadStatus();
    return this.logger.write(`report:${line}`);
  }
}

@Service()
class LifecycleProbeService {
  public initialized = false;
  public destroyed = false;

  @PostConstruct()
  onInit() {
    this.initialized = true;
  }

  @PreDestroy()
  onDestroy() {
    this.destroyed = true;
  }
}

@Module({
  providers: [
    ApiClient,
    UserService,
    RequestIdService,
    LifecycleProbeService,
    {
      provide: LOGGER_TOKEN,
      useFactory: () => ({
        write: (message: string) => `logger:${message}`,
      }),
    },
  ],
})
class AppModule {}

async function main() {
  const moduleRef = await Test.createTestingModule(AppModule)
    .overrideProvider(ApiClient)
    .useValue({
      getStatus: () => "mocked-api",
    })
    .compile();

  const report = moduleRef.get(ReportService);
  assert.strictEqual(report.build(), "logger:report:mocked-api");

  const transientA = moduleRef.get(RequestIdService);
  const transientB = moduleRef.get(RequestIdService);
  assert.notStrictEqual(transientA.value(), transientB.value());

  const lifecycle = moduleRef.get(LifecycleProbeService);
  assert.strictEqual(lifecycle.initialized, true);
  assert.strictEqual(lifecycle.destroyed, false);

  await moduleRef.close();
  assert.strictEqual(lifecycle.destroyed, true);

  const moduleRefA = await Test.createTestingModule({
    providers: [{ provide: "counter", useValue: { value: 1 } }],
  }).compile();

  const moduleRefB = await Test.createTestingModule({
    providers: [{ provide: "counter", useValue: { value: 2 } }],
  }).compile();

  assert.strictEqual(moduleRefA.get<{ value: number }>("counter").value, 1);
  assert.strictEqual(moduleRefB.get<{ value: number }>("counter").value, 2);

  await moduleRefA.close();
  await moduleRefB.close();

  console.log("[25-testing_app] all runtime assertions passed");
}

void main().catch((error) => {
  console.error("[25-testing_app] failure", error);
  process.exit(1);
});
