import { Container, Service, AutoWired } from "../../src/di/index";

@Service()
class TestService{
    getValue():number {
        return 42;
    }   
}



describe("Container", () => {
    let container : Container
    
    beforeEach(() => {
        container = new Container();
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
}); 