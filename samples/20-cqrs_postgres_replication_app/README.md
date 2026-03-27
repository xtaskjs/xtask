# 20-cqrs_postgres_replication_app

Node HTTP CQRS sample using `@xtaskjs/cqrs` and `@xtaskjs/typeorm` with PostgreSQL master/slave replication running in Docker.

## What This Sample Shows

- A PostgreSQL master container that accepts every write.
- A PostgreSQL slave container that serves every read.
- A CQRS write model stored on the master.
- A read projection table written on the master and replicated to the slave.
- Query handlers that only read from the slave connection.
- Idempotent command handling, a process manager, and projection rebuild tooling.

## Start PostgreSQL Replication

From this folder, start the Docker services:

```bash
docker-compose up -d
```

Watch the replication containers if you want to confirm startup:

```bash
docker-compose logs -f postgres-master postgres-slave
```

Stop and remove the containers plus volumes:

```bash
docker-compose down -v
```

## Run The App

```bash
npm install
npm start
```

From this folder: `samples/20-cqrs_postgres_replication_app`.

## Default Connections

- Master: `127.0.0.1:5433`
- Slave: `127.0.0.1:5434`
- Database: `xtask_cqrs`
- User: `xtask`
- Password: `xtask`

You can override them with:

- `PG_MASTER_HOST`
- `PG_MASTER_PORT`
- `PG_SLAVE_HOST`
- `PG_SLAVE_PORT`
- `PG_DATABASE`
- `PG_USER`
- `PG_PASSWORD`

## Test URLs

- Health endpoint:
  - http://127.0.0.1:3000/health
- Sample overview:
  - http://127.0.0.1:3000/cqrs
- Replicated read model list from the slave:
  - http://127.0.0.1:3000/cqrs/users
- CQRS replication diagnostics:
  - http://127.0.0.1:3000/cqrs/debug/state
- Rebuild projections on the master:
  - `POST http://127.0.0.1:3000/cqrs/projections/rebuild`
- Create a user through the command bus:
  - `POST http://127.0.0.1:3000/cqrs/users`
- Rename a user through the command bus:
  - `POST http://127.0.0.1:3000/cqrs/users/1/rename`

Example request body for `POST /cqrs/users`:

```json
{
  "displayName": "Ada Lovelace",
  "email": "ada@example.com",
  "requestId": "pg-signup-ada-001"
}
```

Example request body for `POST /cqrs/users/1/rename`:

```json
{
  "displayName": "Ada Byron",
  "requestId": "pg-rename-ada-001"
}
```

## Behavior Notes

- `CreateUserCommand` writes the aggregate row on the master.
- `RenameUserCommand` updates the aggregate row on the master and publishes a rename event.
- `UserProjectionHandler` writes the projection row on the master as well, because the slave is read-only.
- `UserRenameProjectionHandler` updates the projection row on the master, and the slave picks up the change via replication.
- `ListUsersQuery` reads the projection table from the slave only.
- `GET /cqrs/debug/state` queries both connections and reports `pg_is_in_recovery()` so you can verify the master/slave split.
- Because PostgreSQL replication is asynchronous, a new write may take a short moment to appear on the slave.