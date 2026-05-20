import "reflect-metadata";
import { describe, beforeEach, afterEach, expect, test } from "@jest/globals";
import { Container } from "@xtaskjs/core";
import { Column, DataSource, Entity, PrimaryGeneratedColumn, Repository } from "typeorm";
import {
  clearRegisteredTypeOrmMigrations,
  clearRegisteredTypeOrmSeeders,
  clearRegisteredTypeOrmDataSources,
  getDataSourceToken,
  getRepositoryToken,
  getTypeOrmLifecycleManager,
  initializeTypeOrmIntegration,
  TypeOrmMigration,
  TypeOrmSeeder,
  registerTypeOrmDataSource,
  shutdownTypeOrmIntegration,
} from "../src";

@Entity("users")
class UserEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 120 })
  name!: string;
}

describe("@xtaskjs/typeorm sqlite integration", () => {
  beforeEach(async () => {
    await shutdownTypeOrmIntegration();
    clearRegisteredTypeOrmDataSources();
    clearRegisteredTypeOrmMigrations();
    clearRegisteredTypeOrmSeeders();
  });

  afterEach(async () => {
    await shutdownTypeOrmIntegration();
    clearRegisteredTypeOrmDataSources();
    clearRegisteredTypeOrmMigrations();
    clearRegisteredTypeOrmSeeders();
  });

  test("initializes datasource and persists with sqlite memory", async () => {
    registerTypeOrmDataSource({
      name: "default",
      type: "sqlite",
      database: ":memory:",
      entities: [UserEntity],
      synchronize: true,
    });

    await initializeTypeOrmIntegration();

    const manager = getTypeOrmLifecycleManager();
    const repository = manager.getRepository(UserEntity);

    await repository.save(repository.create({ name: "Ada" }));
    const users = await repository.find();

    expect(users).toHaveLength(1);
    expect(users[0].name).toBe("Ada");
  });

  test("registers datasource and repository instances in container", async () => {
    const container = new Container();

    registerTypeOrmDataSource({
      name: "default",
      type: "sqlite",
      database: ":memory:",
      entities: [UserEntity],
      synchronize: true,
    });

    await initializeTypeOrmIntegration(container);

    const dataSource = container.getByName<DataSource>(getDataSourceToken());
    const repository = container.getByName<Repository<UserEntity>>(getRepositoryToken(UserEntity));

    expect(dataSource.isInitialized).toBe(true);

    await repository.save(repository.create({ name: "Grace" }));
    const users = await repository.find();

    expect(users).toHaveLength(1);
    expect(users[0].name).toBe("Grace");
  });

  test("runs registered migrations and seeders on startup", async () => {
    @TypeOrmMigration({ dataSourceName: "default" })
    class CreateAuditEntriesMigration1700000000000 {
      async up(queryRunner: any): Promise<void> {
        await queryRunner.query(
          "CREATE TABLE audit_entries (id integer primary key autoincrement, message varchar(120) not null)"
        );
      }

      async down(queryRunner: any): Promise<void> {
        await queryRunner.query("DROP TABLE audit_entries");
      }
    }

    @TypeOrmSeeder({ dataSourceName: "default", order: 1 })
    class SeedAuditEntriesSeeder {
      async run(dataSource: DataSource): Promise<void> {
        await dataSource.query('INSERT INTO audit_entries (message) VALUES ("seeded")');
      }
    }

    registerTypeOrmDataSource({
      name: "default",
      type: "sqlite",
      database: ":memory:",
      entities: [UserEntity],
      synchronize: true,
      runMigrationsOnServerStart: true,
      runSeedersOnServerStart: true,
    });

    await initializeTypeOrmIntegration();

    const manager = getTypeOrmLifecycleManager();
    const rows = await manager.getDataSource().query("SELECT message FROM audit_entries ORDER BY id ASC");

    expect(rows).toEqual([{ message: "seeded" }]);
  });
});
