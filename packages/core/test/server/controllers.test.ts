import "reflect-metadata";
import {
  Controller,
  Get,
  UseGuards,
  UseMiddlewares,
  UsePipes,
} from "../../../common/src/decorators/core/server/controller";
import { ApplicationLifeCycle } from "../../src/server/application-lifecycle";
import { registerControllerRoutes } from "../../src/server/registercontrollers";

describe("Controller route integration", () => {
  it("should execute middlewares, guards and pipes before handler", async () => {
    const callOrder: string[] = [];

    const middleware = async (_context, next) => {
      callOrder.push("middleware");
      return next();
    };

    const guard = () => {
      callOrder.push("guard");
      return true;
    };

    const pipe = (value) => {
      callOrder.push("pipe");
      return typeof value === "string" ? value.toUpperCase() : value;
    };

    class UsersController {
      hello(name: string) {
        callOrder.push("handler");
        return `HELLO ${name}`;
      }
    }

    Controller("users")(UsersController);
    UseMiddlewares(middleware)(UsersController);
    UseGuards(guard)(UsersController);
    UsePipes(pipe)(UsersController);

    const helloDescriptor = Object.getOwnPropertyDescriptor(UsersController.prototype, "hello");
    Get("/hello")(UsersController.prototype, "hello", helloDescriptor);

    const app = new ApplicationLifeCycle();
    const controller = new UsersController();

    registerControllerRoutes(controller, app);

    const result = await app.dispatchControllerRoute("GET", "/users/hello", "john");

    expect(result).toBe("HELLO JOHN");
    expect(callOrder).toEqual(["guard", "pipe", "middleware", "handler"]);
  });

  it("should expose request, response and auth state in route context", async () => {
    const contexts: any[] = [];
    const guard = (context) => {
      context.auth.isAuthenticated = true;
      context.auth.roles.push("admin");
      contexts.push(context);
      return true;
    };

    class UsersController {
      hello() {
        return "ok";
      }
    }

    Controller("users")(UsersController);
    UseGuards(guard)(UsersController);

    const helloDescriptor = Object.getOwnPropertyDescriptor(UsersController.prototype, "hello");
    Get("/hello")(UsersController.prototype, "hello", helloDescriptor);

    const app = new ApplicationLifeCycle();
    const controller = new UsersController();
    const request = { headers: { authorization: "Bearer token" } };
    const response = { statusCode: 200 };

    registerControllerRoutes(controller, app);
    await app.dispatchControllerRoute("GET", "/users/hello", request, response);

    expect(contexts[0].request).toBe(request);
    expect(contexts[0].response).toBe(response);
    expect(contexts[0].auth).toEqual({
      isAuthenticated: true,
      roles: ["admin"],
    });
    expect(contexts[0].state).toEqual({});
  });
});
