import "reflect-metadata";
import { afterEach, describe, expect, test } from "vitest";
import { AutoWired, PostConstruct, PreDestroy, Qualifier, Service } from "@xtaskjs/core";
import { Module, Test } from "../src";

const CLOCK_TOKEN = "clock";

@Service()
class ClockService {
  now(): string {
    return "real-clock";
  }
}

@Service()
class MessageService {
  constructor(private readonly clockService: ClockService) {}

  value(): string {
    return this.clockService.now();
  }
}

@Service()
class QualifiedMessageService {
  constructor(@Qualifier(CLOCK_TOKEN) private readonly clock: { now(): string }) {}

  value(): string {
    return this.clock.now();
  }
}

@Service()
class AutoWiredService {
  @AutoWired()
  private readonly messageService!: MessageService;

  read(): string {
    return this.messageService.value();
  }
}

@Service()
class LifecycleService {
  public started = false;
  public stopped = false;

  @PostConstruct()
  onStart() {
    this.started = true;
  }

  @PreDestroy()
  onStop() {
    this.stopped = true;
  }
}

@Module({
  providers: [ClockService, MessageService],
})
class BaseModule {}

@Module({
  imports: [BaseModule],
  providers: [
    QualifiedMessageService,
    AutoWiredService,
    LifecycleService,
    {
      provide: CLOCK_TOKEN,
      useFactory: () => ({ now: () => "qualified-clock" }),
    },
  ],
})
class RootModule {}

describe("@xtaskjs/testing", () => {
  const openedModules: Array<{ close(): Promise<void> }> = [];

  afterEach(async () => {
    while (openedModules.length > 0) {
      const moduleRef = openedModules.pop();
      if (moduleRef) {
        await moduleRef.close();
      }
    }
  });

  test("creates isolated containers per testing module", async () => {
    const firstModule = await Test.createTestingModule({
      providers: [{ provide: "counter", useValue: { value: 1 } }],
    }).compile();
    openedModules.push(firstModule);

    const secondModule = await Test.createTestingModule({
      providers: [{ provide: "counter", useValue: { value: 2 } }],
    }).compile();
    openedModules.push(secondModule);

    expect(firstModule.get<{ value: number }>("counter").value).toBe(1);
    expect(secondModule.get<{ value: number }>("counter").value).toBe(2);
  });

  test("resolves providers from imported modules", async () => {
    const moduleRef = await Test.createTestingModule(RootModule).compile();
    openedModules.push(moduleRef);

    const message = moduleRef.get(MessageService);
    const qualifiedMessage = moduleRef.get(QualifiedMessageService);
    const autoWired = moduleRef.get(AutoWiredService);

    expect(message.value()).toBe("real-clock");
    expect(qualifiedMessage.value()).toBe("qualified-clock");
    expect(autoWired.read()).toBe("real-clock");
  });

  test("overrides class providers with useValue", async () => {
    const moduleRef = await Test.createTestingModule(RootModule)
      .overrideProvider(ClockService)
      .useValue({ now: () => "mock-clock" })
      .compile();
    openedModules.push(moduleRef);

    const message = moduleRef.get(MessageService);
    expect(message.value()).toBe("mock-clock");
  });

  test("overrides providers with useFactory and inject", async () => {
    const moduleRef = await Test.createTestingModule(RootModule)
      .overrideProvider(MessageService)
      .useFactory((clock: ClockService) => new MessageService(clock), [ClockService])
      .compile();
    openedModules.push(moduleRef);

    const message = moduleRef.get(MessageService);
    expect(message.value()).toBe("real-clock");
  });

  test("runs lifecycle hooks on compile and close", async () => {
    const moduleRef = await Test.createTestingModule(RootModule).compile();
    openedModules.push(moduleRef);

    const lifecycle = moduleRef.get(LifecycleService);
    expect(lifecycle.started).toBe(true);
    expect(lifecycle.stopped).toBe(false);

    await moduleRef.close();
    expect(lifecycle.stopped).toBe(true);
  });
});
