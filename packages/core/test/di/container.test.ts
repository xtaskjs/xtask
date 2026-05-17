import { Container, Service, AutoWired } from "../../src/di/index";
import { Logger } from "@xtaskjs/common";

@Service()
class TestService{
    getValue():number {
        return 42;
    }   
}

@Service()
class LazyDependencyService {
    static createdCount = 0;

    constructor() {
        LazyDependencyService.createdCount += 1;
    }

    touch(): string {
        return "touched";
    }
}

@Service()
class LazyConsumerService {
    constructor(public readonly lazyDependency: LazyDependencyService) {}

    noDependencyUsage(): string {
        return "ok";
    }

    useDependency(): string {
        return this.lazyDependency.touch();
    }
}

@Service({ scope: "transient" })
class TransientMetricService {
    run(): string {
        return "done";
    }
}

@Service()
class ConstructorLoggerConsumer {
    constructor(private readonly logger: Logger) {}

    run(): void {
        this.logger.info("constructor logger context");
    }
}

@Service()
class AutoWiredLoggerConsumer {
    @AutoWired()
    logger!: Logger;

    run(): void {
        this.logger.info("autowired logger context");
    }
}



describe("Container", () => {
    let container : Container
    
    beforeEach(() => {
        container = new Container();
        LazyDependencyService.createdCount = 0;
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("should register and resolve a singleton service", () => {
        container.register(TestService, { scope: "singleton" });
        const resolved = container.get(TestService);
        expect(resolved.getValue()).toBe(42);

    });

    it("should return singleton instances y default ", () => {
        container.register(TestService, { scope: "singleton" });
        
        const instance1 = container.get(TestService);
        
        const instance2 = container.get(TestService);
        
        expect(instance1).toBe(instance2); // Same instance
    });
    
    it("should return new instances for transient scope", () => {
        container.register(TestService, { scope: "transient" });
        
        const instance1 = container.get(TestService);
        
        const instance2 = container.get(TestService);
        
        expect(instance1).not.toBe(instance2); // Different instances
    });

    it ("should throw error for unregistered services", () =>{
        expect(() => container.get(TestService)).toThrow("No provider found for TestService");
    });

    it("should lazily resolve constructor dependencies when first used", () => {
        container.register(LazyDependencyService, { scope: "singleton" });
        container.register(LazyConsumerService, { scope: "singleton" });

        const consumer = container.get(LazyConsumerService);
        expect(LazyDependencyService.createdCount).toBe(0);

        expect(consumer.noDependencyUsage()).toBe("ok");
        expect(LazyDependencyService.createdCount).toBe(0);

        expect(consumer.useDependency()).toBe("touched");
        expect(LazyDependencyService.createdCount).toBe(1);
    });

    it("should keep singleton semantics after lazy dependency resolution", () => {
        container.register(LazyDependencyService, { scope: "singleton" });
        container.register(LazyConsumerService, { scope: "singleton" });

        const consumer = container.get(LazyConsumerService);
        consumer.useDependency();
        consumer.useDependency();

        expect(LazyDependencyService.createdCount).toBe(1);
    });

    it("should resolve constructor dependencies eagerly when configured", () => {
        const eagerContainer = new Container({ resolutionStrategy: "eager" });
        eagerContainer.register(LazyDependencyService, { scope: "singleton" });
        eagerContainer.register(LazyConsumerService, { scope: "singleton" });

        const consumer = eagerContainer.get(LazyConsumerService);

        expect(consumer).toBeInstanceOf(LazyConsumerService);
        expect(LazyDependencyService.createdCount).toBe(1);
    });

    it("should track instantiation metrics per component", () => {
        container.register(LazyDependencyService, { scope: "singleton" });
        container.register(LazyConsumerService, { scope: "singleton" });
        container.register(TransientMetricService, { scope: "transient" });

        const consumer = container.get(LazyConsumerService);
        consumer.useDependency();
        container.get(TransientMetricService).run();
        container.get(TransientMetricService).run();

        const metrics = container.getInstantiationMetrics();
        const dependencyMetric = metrics.find((entry) => entry.componentName === "LazyDependencyService");
        const transientMetric = metrics.find((entry) => entry.componentName === "TransientMetricService");

        expect(dependencyMetric).toBeDefined();
        expect(dependencyMetric?.instancesCreated).toBe(1);
        expect(dependencyMetric?.scope).toBe("singleton");
        expect((dependencyMetric?.totalInstantiationMs || 0)).toBeGreaterThanOrEqual(0);

        expect(transientMetric).toBeDefined();
        expect(transientMetric?.instancesCreated).toBe(2);
        expect(transientMetric?.scope).toBe("transient");
        expect((transientMetric?.averageInstantiationMs || 0)).toBeGreaterThanOrEqual(0);

        container.resetInstantiationMetrics();
        expect(container.getInstantiationMetrics()).toEqual([]);
    });

    it("should set logger context automatically for constructor injection", () => {
        container.register(ConstructorLoggerConsumer, { scope: "singleton" });
        const spy = jest.spyOn(console, "log").mockImplementation();

        container.get(ConstructorLoggerConsumer).run();

        const latestCall = spy.mock.calls[spy.mock.calls.length - 1];
        const output = (latestCall?.[0] || "") as string;
        expect(output).toContain("[ConstructorLoggerConsumer]");
    });

    it("should set logger context automatically for autowired injection", () => {
        container.register(AutoWiredLoggerConsumer, { scope: "singleton" });
        const spy = jest.spyOn(console, "log").mockImplementation();

        container.get(AutoWiredLoggerConsumer).run();

        const latestCall = spy.mock.calls[spy.mock.calls.length - 1];
        const output = (latestCall?.[0] || "") as string;
        expect(output).toContain("[AutoWiredLoggerConsumer]");
    });

    it("should apply configured logger options to injected logger", () => {
        const configuredContainer = new Container({
            logger: {
                appName: "MyApp",
                useColors: false,
            },
        });
        configuredContainer.register(ConstructorLoggerConsumer, { scope: "singleton" });
        const spy = jest.spyOn(console, "log").mockImplementation();

        configuredContainer.get(ConstructorLoggerConsumer).run();

        const latestCall = spy.mock.calls[spy.mock.calls.length - 1];
        const output = (latestCall?.[0] || "") as string;
        expect(output).toContain("[MyApp]");
        expect(output).toContain("[ConstructorLoggerConsumer]");
    });
}); 