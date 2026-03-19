# @xtaskjs/typeorm

TypeORM integration package for xtaskjs.

This package is part of the xtaskjs project, hosted at [xtaskjs.io](https://xtaskjs.io).

## Installation
```bash
npm install @xtaskjs/typeorm typeorm reflect-metadata
```

## What It Provides
- Re-exports all TypeORM APIs and decorators (`Entity`, `Column`, `OneToMany`, etc.).
- Datasource lifecycle management integrated with xtask lifecycle.
- Container tokens + decorators for datasource and repository injection.

## Configure Datasources
```typescript
import { registerTypeOrmDataSource } from "@xtaskjs/typeorm";

registerTypeOrmDataSource({
  type: "sqlite",
  database: "./app.db",
  synchronize: true,
  entities: [User],
});
```

You can also use the class decorator form:
```typescript
import { TypeOrmDataSource } from "@xtaskjs/typeorm";

@TypeOrmDataSource({
  name: "default",
  type: "sqlite",
  database: "./app.db",
  entities: [User],
  synchronize: true,
})
class DatabaseConfig {}
```

## Inject Datasource / Repository
```typescript
import { Service } from "@xtaskjs/core";
import { DataSource, Repository, InjectDataSource, InjectRepository } from "@xtaskjs/typeorm";

@Service({ scope: "singleton" })
export class UserService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(User) private readonly users: Repository<User>
  ) {}
}
```

## Lifecycle Behavior
- During container registration (`CreateApplication` bootstrap): datasources are initialized.
- During `app.close()`: initialized datasources are destroyed.

## Resources
- Project site and documentation: [xtaskjs.io](https://xtaskjs.io)
- npm package: [@xtaskjs/typeorm](https://www.npmjs.com/package/@xtaskjs/security)
- Source repository: [xtaskjs/xtaskjs](https://github.com/xtaskjs/xtaskjs)
