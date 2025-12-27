import { Container, Service, AutoWired, Qualifier } from "../../src/di/index";

interface INotificiationService{
    send(message:string):string;
}

@Service({name: "emailNotificer"})
class EmailNotificationService implements INotificiationService{
    send(message: string):string {
        return `Email sent: ${message}`;
    }
}

@Service({name: "smsNotificer"})
class SMSNotificationService implements INotificiationService{
    send(message: string):string {
        return `SMS sent: ${message}`;
    }
}

@Service()
class OrderService {
    constructor(
        @Qualifier("emailNotificer") public emailService: INotificiationService,
        @Qualifier("smsNotificer") public smsService: INotificiationService
    ){}
}

describe ("Qualifier Decorator", () => {
    let container:Container;
    
    beforeEach(() => {
          container = new Container();
     });

     it("should inject beans by qualifier name", () => {
        container.registerWithName(EmailNotificationService,{ scope: "singleton"}, "emailNotificer");
        container.registerWithName(SMSNotificationService,{ scope: "singleton"}, "smsNotificer");
        container.register(OrderService, { scope: "singleton" });

        const orderService = container.get(OrderService);
        expect(orderService).toBeInstanceOf(OrderService);
        expect(orderService['emailService']).toBeInstanceOf(EmailNotificationService);
        expect(orderService['smsService']).toBeInstanceOf(SMSNotificationService);
        expect(orderService.emailService.send("Hello")).toBe("Email sent: Hello");
        expect(orderService.smsService.send("Hello")).toBe("SMS sent: Hello");
    });

    it ("should retrieve beans by name from container", () =>{
        container.registerWithName(EmailNotificationService,{ scope: "singleton"}, "emailNotificer");
        
        const notifier = container.getByName<EmailNotificationService>("emailNotificer");
        expect(notifier).toBeInstanceOf(EmailNotificationService);
        expect(notifier.send("Test")).toBe("Email sent: Test");
    });

    it ("should throw error for unknown qualifier names", () =>{
        expect(() => container.getByName("unknownService")).toThrow("No component found with name: unknownService");
    });
})