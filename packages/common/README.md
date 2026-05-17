# @xtaskjs/common

Common utilities for xtaskjs, a modern, fast Node.js web framework.

This package is part of the xtaskjs project, hosted at [xtaskjs.io](https://xtaskjs.io).

## Installation
```bash
npm install @xtaskjs/common
```

## Usage
```typescript
import { ... } from '@xtaskjs/common';
```

## Features
- Logger
- Decorators
- ValidationPipe with `class-validator` and `class-transformer`
- Shared types and constants

## Logger

The `Logger` supports:
- Colored console output by log level (`info`, `warn`, `error`)
- Optional persistence to a `.log` file
- Configurable file location and service context

```typescript
import { Logger } from "@xtaskjs/common";

const logger = new Logger({
	appName: "xTaskjs",
	context: "MyService",
	useColors: true,
	file: {
		enabled: true,
		path: "./logs/my-service.log", // Can be a .log file path or a folder path
	},
});

logger.info("Doing something with timestamp here");
logger.warn("Potential issue detected");
logger.error("Unexpected error");
```

Example output format:

```text
[xTaskjs] 19096   - 04/19/2024, 7:12:59 AM   [MyService] Doing something with timestamp here +5ms
```

## HTTP Controllers (Nest-style)
```typescript
import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Query,
	Req,
	Res,
	Patch,
	Delete,
	UseMiddlewares,
	UseGuards,
	UsePipes,
	ValidationPipe,
} from "@xtaskjs/common";

import { IsEmail, IsString, MinLength } from "class-validator";

class CreateUserDto {
	@IsEmail()
	email!: string;

	@IsString()
	@MinLength(8)
	password!: string;
}

class UserParamsDto {
	@IsString()
	id!: string;
}

@Controller("users")
@UseGuards((ctx) => true)
class UsersController {
	@Get("/")
	list() {}

	@Post("/")
	create(@Body() body: CreateUserDto, @Req() req: any, @Res() res: any) {
		return { body, ip: req.ip, hasResponse: Boolean(res) };
	}

	@Patch("/:id")
	update(@Param() params: UserParamsDto, @Query("expand") expand?: string) {
		return { id: params.id, expand };
	}

	@Delete("/:id")
	remove() {}
}
```

## Request Validation

The common package exposes a `ValidationPipe` that transforms `@Body()`, `@Param()`, and `@Query()` DTOs with `class-transformer` and validates them with `class-validator`.

Install the validator dependencies in applications that use DTO validation:

```bash
npm install class-transformer class-validator
```

`@xtaskjs/core` now registers `new ValidationPipe()` globally during `CreateApplication()`, so DTO validation is enabled by default at startup.

## Resources
- Project site and documentation: [xtaskjs.io](https://xtaskjs.io)
- npm package: [@xtaskjs/common](https://www.npmjs.com/package/@xtaskjs/common)
- Source repository: [xtaskjs/xtaskjs](https://github.com/xtaskjs/xtaskjs)