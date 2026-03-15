import "reflect-metadata";
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  ValidationPipe,
  UseGuards,
  UseMiddlewares,
  UsePipes,
} from "../../../common/src";
import { IsInt, IsString, Min } from "class-validator";
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

  it("should resolve decorated route arguments and validate DTOs", async () => {
    class CreateUserBody {
      @IsString()
      name!: string;

      @IsInt()
      @Min(18)
      age!: number;
    }

    class UserParams {
      @IsString()
      id!: string;
    }

    class UsersController {
      create(
        @Body() body: CreateUserBody,
        @Param() params: UserParams,
        @Query("verbose") verbose: boolean,
        @Req() request: any,
        @Res() response: any
      ) {
        return { body, params, verbose, request, response };
      }
    }

    Controller("users")(UsersController);

    const createDescriptor = Object.getOwnPropertyDescriptor(UsersController.prototype, "create");
    Post("/:id")(UsersController.prototype, "create", createDescriptor);

    const app = new ApplicationLifeCycle();
    app.useGlobalPipes(new ValidationPipe());

    const controller = new UsersController();
    registerControllerRoutes(controller, app);

    const request = {
      body: { name: "Ada", age: "23" },
      query: { verbose: "true" },
    };
    const response = { statusCode: 200 };

    const result = await app.dispatchControllerRoute("POST", "/users/user-1", request, response);

    expect(result.body).toBeInstanceOf(CreateUserBody);
    expect(result.body).toEqual(expect.objectContaining({ name: "Ada", age: 23 }));
    expect(result.params).toBeInstanceOf(UserParams);
    expect(result.params).toEqual(expect.objectContaining({ id: "user-1" }));
    expect(result.verbose).toBe(true);
    expect(result.request).toBe(request);
    expect(result.response).toBe(response);
  });

  it("should reject invalid DTO payloads with a 400 validation error", async () => {
    class CreateUserBody {
      @IsString()
      name!: string;

      @IsInt()
      @Min(18)
      age!: number;
    }

    class UsersController {
      create(@Body() body: CreateUserBody) {
        return body;
      }
    }

    Controller("users")(UsersController);

    const createDescriptor = Object.getOwnPropertyDescriptor(UsersController.prototype, "create");
    Post("/")(UsersController.prototype, "create", createDescriptor);

    const app = new ApplicationLifeCycle();
    app.useGlobalPipes(new ValidationPipe());

    registerControllerRoutes(new UsersController(), app);

    await expect(
      app.dispatchControllerRoute(
        "POST",
        "/users",
        { body: { name: "Ada", age: "12" }, query: {} },
        {}
      )
    ).rejects.toMatchObject({
      statusCode: 400,
      payload: expect.objectContaining({
        message: "Validation failed",
        fields: ["age"],
      }),
    });
  });
});
