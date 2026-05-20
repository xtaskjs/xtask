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
- Migration and seeder registries with decorators for startup execution.
- Container tokens + decorators for datasource and repository injection.

## Configure Datasources
```typescript
import { registerTypeOrmDataSource } from "@xtaskjs/typeorm";

registerTypeOrmDataSource({
  type: "sqlite",
  database: "./app.db",
  synchronize: true,
  runMigrationsOnServerStart: true,
  runSeedersOnServerStart: true,
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

## Register Migrations and Seeders
```typescript
import { DataSource, MigrationInterface, QueryRunner } from "typeorm";
import { TypeOrmMigration, TypeOrmSeeder } from "@xtaskjs/typeorm";

@TypeOrmMigration({ dataSourceName: "default" })
export class CreateAuditEntries1700000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TABLE audit_entries (id integer primary key autoincrement, message varchar(120) not null)"
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE audit_entries");
  }
}

@TypeOrmSeeder({ dataSourceName: "default", order: 1 })
export class AuditEntriesSeeder {
  async run(dataSource: DataSource): Promise<void> {
    await dataSource.query('INSERT INTO audit_entries (message) VALUES ("seeded")');
  }
}
```

Migration classes should end with a JavaScript timestamp suffix so TypeORM accepts them at runtime.

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
- If enabled, migrations run and seeders execute after datasource initialization.
- During `app.close()`: initialized datasources are destroyed.

## Resources
- Project site and documentation: [xtaskjs.io](https://xtaskjs.io)
- npm package: [@xtaskjs/typeorm](https://www.npmjs.com/package/@xtaskjs/typeorm)
- Source repository: [xtaskjs/xtask](https://github.com/xtaskjs/xtask/tree/main/packages/typeorm)
