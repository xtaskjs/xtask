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
- Shared types and constants

## HTTP Controllers (Nest-style)
```typescript
import {
	Controller,
	Get,
	Post,
	Patch,
	Delete,
	UseMiddlewares,
	UseGuards,
	UsePipes,
} from "@xtaskjs/common";

@Controller("users")
@UseGuards((ctx) => true)
class UsersController {
	@Get("/")
	list() {}

	@Post("/")
	create() {}

	@Patch("/:id")
	update() {}

	@Delete("/:id")
	remove() {}
}
```

## Documentation
See [xtaskjs.com](https://xtaskjs.com) for full documentation.
