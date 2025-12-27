import { Service } from '../../../core/src/di/stereotypes';
import { PostConstruct } from '../../../core/src/di/lifecycle';

@Service({ scope: "singleton" })
export class Logger {

    constructor() {}
    
  @PostConstruct()
  init() {
    console.log("Logger Initialized");
  }

    
    info(message: string): void {
        console.log(`INFO: ${message}`);
    }

    warn(message: string): void {
        console.warn(`WARN: ${message}`);
    }

    error(message: string): void {
        console.error(`ERROR: ${message}`);
    }
}