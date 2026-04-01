import { getTypeOrmLifecycleManager } from "@xtaskjs/typeorm";
import { DataSource, QueryRunner, Table } from "typeorm";
import { resolvePayloadEventSourceName } from "./metadata";
import { AppendEventsRequest, EventEnvelope, IEventStore } from "./types";

interface EventStoreRow {
  aggregate_name: string;
  event_name: string;
  id: string;
  metadata: string;
  occurred_at: string | Date;
  payload: string;
  stream: string;
  stream_id: string;
  stream_key: string;
  version: number;
}

export interface TypeOrmEventStoreOptions {
  dataSource?: DataSource;
  dataSourceName?: string;
  tableName?: string;
}

const createEventId = (): string => {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

export class TypeOrmEventStore implements IEventStore {
  private tableEnsured = false;

  constructor(private readonly options: TypeOrmEventStoreOptions = {}) {}

  async append<T = any>(request: AppendEventsRequest<T>): Promise<EventEnvelope<T>[]> {
    const dataSource = this.getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await this.ensureTable(queryRunner);
      await queryRunner.startTransaction();

      const currentVersion = await this.getCurrentVersion(queryRunner, request.stream, request.streamId);
      const expectedVersion = request.expectedVersion ?? currentVersion;

      if (currentVersion !== expectedVersion) {
        throw new Error(
          `Event stream concurrency conflict for '${request.aggregateName}:${request.streamId}'. Expected version ${expectedVersion} but found ${currentVersion}`
        );
      }

      const streamKey = this.getStreamKey(request.stream, request.streamId);
      const rows = request.events.map((event, index) => {
        const version = currentVersion + index + 1;
        return {
          id: event.id || createEventId(),
          stream: request.stream,
          stream_id: request.streamId,
          stream_key: streamKey,
          aggregate_name: request.aggregateName,
          event_name: event.eventName || resolvePayloadEventSourceName(event.payload),
          version,
          occurred_at: (event.occurredAt || new Date()).toISOString(),
          metadata: JSON.stringify(event.metadata || {}),
          payload: JSON.stringify(event.payload),
        } satisfies EventStoreRow;
      });

      await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(this.getTableName())
        .values(rows)
        .execute();

      await queryRunner.commitTransaction();
      return rows.map((row) => this.toEnvelope<T>(row));
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async load<T = any>(stream: string, streamId: string): Promise<EventEnvelope<T>[]> {
    const dataSource = this.getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await this.ensureTable(queryRunner);
      const rows = await queryRunner.manager
        .createQueryBuilder()
        .select("events.id", "id")
        .addSelect("events.stream", "stream")
        .addSelect("events.stream_id", "stream_id")
        .addSelect("events.stream_key", "stream_key")
        .addSelect("events.aggregate_name", "aggregate_name")
        .addSelect("events.event_name", "event_name")
        .addSelect("events.version", "version")
        .addSelect("events.occurred_at", "occurred_at")
        .addSelect("events.metadata", "metadata")
        .addSelect("events.payload", "payload")
        .from(this.getTableName(), "events")
        .where("events.stream = :stream", { stream })
        .andWhere("events.stream_id = :streamId", { streamId })
        .orderBy("events.version", "ASC")
        .getRawMany<EventStoreRow>();

      return rows.map((row) => this.toEnvelope<T>(row));
    } finally {
      await queryRunner.release();
    }
  }

  async destroy(): Promise<void> {
    this.tableEnsured = false;
  }

  private getDataSource(): DataSource {
    if (this.options.dataSource) {
      return this.options.dataSource;
    }

    return getTypeOrmLifecycleManager().getDataSource(this.options.dataSourceName || "default");
  }

  private getTableName(): string {
    return this.options.tableName?.trim() || "event_store";
  }

  private getStreamKey(stream: string, streamId: string): string {
    return `${stream}:${streamId}`;
  }

  private async ensureTable(queryRunner: QueryRunner): Promise<void> {
    if (this.tableEnsured) {
      return;
    }

    const tableName = this.getTableName();
    const hasTable = await queryRunner.hasTable(tableName);
    if (!hasTable) {
      await queryRunner.createTable(
        new Table({
          name: tableName,
          columns: [
            { name: "id", type: "varchar", isPrimary: true },
            { name: "stream", type: "varchar" },
            { name: "stream_id", type: "varchar" },
            { name: "stream_key", type: "varchar" },
            { name: "aggregate_name", type: "varchar" },
            { name: "event_name", type: "varchar" },
            { name: "version", type: "int" },
            { name: "occurred_at", type: "datetime" },
            { name: "metadata", type: "text" },
            { name: "payload", type: "text" },
          ],
          indices: [
            {
              name: `${tableName}_stream_version_idx`,
              columnNames: ["stream_key", "version"],
              isUnique: true,
            },
          ],
        })
      );
    }

    this.tableEnsured = true;
  }

  private async getCurrentVersion(
    queryRunner: QueryRunner,
    stream: string,
    streamId: string
  ): Promise<number> {
    const streamKey = this.getStreamKey(stream, streamId);
    const result = await queryRunner.manager
      .createQueryBuilder()
      .select("MAX(events.version)", "max")
      .from(this.getTableName(), "events")
      .where("events.stream_key = :streamKey", { streamKey })
      .getRawOne<{ max?: number | string | null }>();

    const max = Number(result?.max || 0);
    return Number.isFinite(max) ? max : 0;
  }

  private toEnvelope<T = any>(row: EventStoreRow): EventEnvelope<T> {
    return {
      id: row.id,
      stream: row.stream,
      streamId: row.stream_id,
      streamKey: row.stream_key,
      aggregateName: row.aggregate_name,
      eventName: row.event_name,
      version: Number(row.version),
      occurredAt: new Date(row.occurred_at),
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      payload: row.payload ? JSON.parse(row.payload) : undefined,
    };
  }
}

export const createTypeOrmEventStore = (
  options: TypeOrmEventStoreOptions = {}
): TypeOrmEventStore => new TypeOrmEventStore(options);