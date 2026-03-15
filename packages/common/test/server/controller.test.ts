import "reflect-metadata";
import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UseMiddlewares,
  UsePipes,
  getControllerMetadata,
  getRouteMetadata,
} from "../../src/decorators/core/server/controller";

describe("Controller Decorators", () => {
  const classMiddleware = jest.fn(async (_context, next) => next());
  const classGuard = jest.fn(() => true);
  const classPipe = jest.fn((value) => value);
  const routeMiddleware = jest.fn(async (_context, next) => next());
  const routeGuard = jest.fn(() => true);
  const routePipe = jest.fn((value) => value);

  class CreateUserDto {
    name!: string;
  }

  class UpdateUserParamsDto {
    id!: string;
  }

  class UsersController {
    list() {}

    create(@Body() _body: CreateUserDto, @Req() _req: any, @Res() _res: any) {}

    update(@Param() _params: UpdateUserParamsDto, @Query("expand") _expand: string) {}

    remove() {}
  }

  Controller({ path: "users", middlewares: [classMiddleware], guards: [classGuard], pipes: [classPipe] })(UsersController);
  UseMiddlewares(classMiddleware)(UsersController);
  UseGuards(classGuard)(UsersController);
  UsePipes(classPipe)(UsersController);

  const listDescriptor = Object.getOwnPropertyDescriptor(UsersController.prototype, "list");
  const createDescriptor = Object.getOwnPropertyDescriptor(UsersController.prototype, "create");
  const updateDescriptor = Object.getOwnPropertyDescriptor(UsersController.prototype, "update");
  const removeDescriptor = Object.getOwnPropertyDescriptor(UsersController.prototype, "remove");

  Get({ path: "/", middlewares: [routeMiddleware], guards: [routeGuard], pipes: [routePipe] })(
    UsersController.prototype,
    "list",
    listDescriptor
  );
  Post("/create")(UsersController.prototype, "create", createDescriptor);
  Patch("/update")(UsersController.prototype, "update", updateDescriptor);
  Delete("/remove")(UsersController.prototype, "remove", removeDescriptor);

  it("should register controller metadata", () => {
    const metadata = getControllerMetadata(UsersController);
    expect(metadata).toBeDefined();
    expect(metadata?.path).toBe("/users");
    expect(metadata?.middlewares.length).toBe(2);
    expect(metadata?.guards.length).toBe(2);
    expect(metadata?.pipes.length).toBe(2);
  });

  it("should register routes with http methods", () => {
    const routes = getRouteMetadata(UsersController);
    expect(routes).toHaveLength(4);

    const methods = routes.map((route) => route.method);
    expect(methods).toEqual(["GET", "POST", "PATCH", "DELETE"]);

    const listRoute = routes.find((route) => route.handler === "list");
    expect(listRoute?.path).toBe("");
    expect(listRoute?.middlewares.length).toBe(1);
    expect(listRoute?.guards.length).toBe(1);
    expect(listRoute?.pipes.length).toBe(1);

    const createRoute = routes.find((route) => route.handler === "create");
    expect(createRoute?.parameters).toEqual([
      expect.objectContaining({ index: 0, source: "body", metatype: CreateUserDto }),
      expect.objectContaining({ index: 1, source: "request" }),
      expect.objectContaining({ index: 2, source: "response" }),
    ]);

    const updateRoute = routes.find((route) => route.handler === "update");
    expect(updateRoute?.parameters).toEqual([
      expect.objectContaining({ index: 0, source: "param", metatype: UpdateUserParamsDto }),
      expect.objectContaining({ index: 1, source: "query", property: "expand", metatype: String }),
    ]);
  });
});
