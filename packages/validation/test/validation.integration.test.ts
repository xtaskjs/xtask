import "reflect-metadata";
import { Body, Controller, Param, Post, Query } from "@xtaskjs/common";
import { Container } from "@xtaskjs/core";
import { z } from "zod";
import * as v from "valibot";
import { ApplicationLifeCycle } from "../../core/src/server/application-lifecycle";
import { registerControllerRoutes } from "../../core/src/server/registercontrollers";
import {
  SchemaDto,
  SchemaValidationPipe,
  ValidatedBody,
  ValidatedParam,
  UseBodySchema,
  UseQuerySchema,
  getValidationServiceToken,
  initializeValidationIntegration,
  resetValidationIntegration,
  valibotSchema,
} from "../src";

describe("@xtaskjs/validation", () => {
  afterEach(() => {
    resetValidationIntegration();
  });

  test("validates zod schemas on body/query/params and keeps DTO classes when attached to metatype", async () => {
    const createUserBodySchema = z.object({
      name: z.string().min(2),
      age: z.coerce.number().int().min(18),
    });
    const createUserQuerySchema = z.object({
      verbose: z.coerce.boolean().default(false),
    });

    @SchemaDto(createUserBodySchema)
    class CreateUserBody {
      name!: string;
      age!: number;
    }

    class UserParams {
      id!: string;
    }

    @Controller("users")
    class UsersController {
      @UseQuerySchema(createUserQuerySchema)
      @Post("/:id")
      create(
        @Body() body: CreateUserBody,
        @ValidatedParam(z.object({ id: z.string().min(1) })) params: UserParams,
        @Query() query: { verbose: boolean }
      ) {
        return { body, params, query };
      }
    }

    const lifecycle = new ApplicationLifeCycle();
    lifecycle.useGlobalPipes(new SchemaValidationPipe());
    registerControllerRoutes(new UsersController(), lifecycle);

    const result = await lifecycle.dispatchControllerRoute(
      "POST",
      "/users/user-1",
      {
        body: { name: "Ada", age: "23" },
        query: { verbose: "true" },
      },
      {}
    );

    expect(result.body).toBeInstanceOf(CreateUserBody);
    expect(result.body).toEqual(expect.objectContaining({ name: "Ada", age: 23 }));
    expect(result.params).toEqual({ id: "user-1" });
    expect(result.query).toEqual({ verbose: true });
  });

  test("validates valibot schemas through explicit wrappers", async () => {
    const signupSchema = valibotSchema(
      v.object({
        email: v.pipe(v.string(), v.email()),
        password: v.pipe(v.string(), v.minLength(8)),
      })
    );

    @Controller("auth")
    class AuthController {
      @UseBodySchema(signupSchema)
      @Post("/signup")
      signup(@ValidatedBody(signupSchema) body: { email: string; password: string }) {
        return body;
      }
    }

    const lifecycle = new ApplicationLifeCycle();
    lifecycle.useGlobalPipes(new SchemaValidationPipe());
    registerControllerRoutes(new AuthController(), lifecycle);

    const result = await lifecycle.dispatchControllerRoute(
      "POST",
      "/auth/signup",
      {
        body: { email: "ada@example.com", password: "supersecret" },
        query: {},
      },
      {}
    );

    expect(result).toEqual({
      email: "ada@example.com",
      password: "supersecret",
    });
  });

  test("returns a 400 payload when schema validation fails", async () => {
    @Controller("users")
    class UsersController {
      @Post("/")
      create(
        @ValidatedBody(
          z.object({
            email: z.string().email(),
            age: z.coerce.number().int().min(18),
          })
        )
        body: unknown
      ) {
        return body;
      }
    }

    const lifecycle = new ApplicationLifeCycle();
    lifecycle.useGlobalPipes(new SchemaValidationPipe());
    registerControllerRoutes(new UsersController(), lifecycle);

    await expect(
      lifecycle.dispatchControllerRoute(
        "POST",
        "/users",
        { body: { email: "bad", age: "12" }, query: {} },
        {}
      )
    ).rejects.toMatchObject({
      statusCode: 400,
      payload: expect.objectContaining({
        message: "Validation failed",
        fields: expect.arrayContaining(["email", "age"]),
      }),
    });
  });

  test("registers a validation service inside the container integration", async () => {
    const container = new Container();
    const lifecycle = new ApplicationLifeCycle();

    await initializeValidationIntegration(container, lifecycle);

    const service = (container as { getByName: <T>(name: string) => T }).getByName(
      getValidationServiceToken()
    );
    expect(service).toBeDefined();
  });
});