import "reflect-metadata";
import { describe, beforeEach, afterEach, expect, test } from "@jest/globals";
import { Container } from "@xtaskjs/core";
import { Column, DataSource, Entity, PrimaryGeneratedColumn, Repository } from "typeorm";
import {
  clearRegisteredTypeOrmDataSources,
  getDataSourceToken,
  getRepositoryToken,
  getTypeOrmLifecycleManager,
  initializeTypeOrmIntegration,
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
  });

  afterEach(async () => {
    await shutdownTypeOrmIntegration();
    clearRegisteredTypeOrmDataSources();
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
});
