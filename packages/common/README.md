# @xtaskjs/common

Common utilities for xtaskjs, a modern, fast Node.js web framework.

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

## Documentation
See [xtaskjs.com](https://xtaskjs.com) for full documentation.
