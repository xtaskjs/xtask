import { Container, Service, AutoWired } from "../../src/di/index";

@Service()
class Logger {
    log(message: string):string {
        return `Log: ${message}`;
    }
}

@Service()
class Database {
    query(sql: string):string {
        return `Result of "${sql}"`;
    }
}

@Service()
class UserService {
    @AutoWired()
    logger!: Logger;

    @AutoWired()
    database!: Database;

    getUser(id: number):string {
        this.logger.log(`Fetching user with id: ${id}`);
        return this.database.query(`SELECT * FROM users WHERE id = ${id}`);
    }
}

@Service()
class OptionalDependencyService {
    @AutoWired({ required: false })
    optionalLogger?: Logger;

   hasLogger(): boolean {
        return this.optionalLogger !==undefined;
    }
}

describe("AutoWired Decorator", () => {
   let container:Container;
   
   beforeEach(() => {
        container = new Container();
    });

    it("should inject dependencies into UserService", () => {
        container.register(Logger, { scope: "singleton" });
        container.register(Database, { scope: "singleton" });
        container.register(UserService, { scope: "singleton" });
        
        const userService = container.get(UserService);
        expect(userService).toBeInstanceOf(UserService);    
      //  expect(userService.getUser(1)).toBe('Result of "SELECT * FROM users WHERE id = 1"');

    });

    it("should handle optional dependencies", () => {
        container.register(OptionalDependencyService, { scope: "singleton" });
        
        const optionalService = container.get(OptionalDependencyService);
        expect(optionalService).toBeInstanceOf(OptionalDependencyService);
        expect(optionalService.hasLogger()).toBe(false); // Logger is not registered, should be undefined
    });

    it("should throw error for missing required dependencies", () => {
        container.register(UserService, { scope: "singleton" });
        
        expect(() => container.get(UserService)).toThrow();
    });

    it("should inject dependencies into constructor and field dependencies", () => {
        container.register(Logger, { scope: "singleton" });
        container.register(Database, { scope: "singleton" });
        container.register(UserService, { scope: "singleton" });
        
        const userService = container.get(UserService);
        expect(userService).toBeDefined();
        expect(userService.getUser(1)).toBeDefined();
 
    });
});