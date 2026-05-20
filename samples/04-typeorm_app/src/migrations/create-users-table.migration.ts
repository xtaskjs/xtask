import {
  MigrationInterface,
  QueryRunner,
  Table,
  TypeOrmMigration,
} from "@xtaskjs/typeorm";

@TypeOrmMigration({ dataSourceName: "default" })
export class CreateUsersTable1700000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const hasUsersTable = await queryRunner.hasTable("users");
    if (hasUsersTable) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: "users",
        columns: [
          {
            name: "id",
            type: "integer",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "name",
            type: "varchar",
            length: "120",
            isNullable: false,
          },
        ],
      })
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const hasUsersTable = await queryRunner.hasTable("users");
    if (!hasUsersTable) {
      return;
    }

    await queryRunner.dropTable("users");
  }
}