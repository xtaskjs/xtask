# 17-queues_rabbitmq_app

Node HTTP sample application using `@xtaskjs/queues` with the RabbitMQ transport helper.

## Run

```bash
npm install
npm run rabbitmq:up
npm start
```

From this folder: `samples/17-queues_rabbitmq_app`.

RabbitMQ management UI:

- http://127.0.0.1:15672
- username: `guest`
- password: `guest`

## Environment

- `AMQP_URL`: defaults to `amqp://guest:guest@127.0.0.1:5672`
- `AMQP_EXCHANGE`: defaults to `xtask.samples.orders`
- `AMQP_DLX`: defaults to `<exchange>.dlx`
- `PORT`: defaults to `3000`

## Test URLs

- Health endpoint:
  - http://127.0.0.1:3000/health
- Sample overview:
  - http://127.0.0.1:3000/queues
- Queue runtime state:
  - http://127.0.0.1:3000/queues/status
- Publish a normal `orders.created` message:
  - `POST http://127.0.0.1:3000/queues/orders`
- Publish an `orders.created` message that fails once and then retries:
  - `POST http://127.0.0.1:3000/queues/orders/42/fail`
- Publish an `orders.completed` message through the decorator:
  - `POST http://127.0.0.1:3000/queues/orders/42/complete`

Example request body for `POST /queues/orders`:

```json
{
  "orderId": "42",
  "customerId": "customer-7",
  "priority": "high"
}
```

## What It Demonstrates

- `createRabbitMqTransport()` with a topic exchange and QoS.
- `QueueHandler()` consumers bound to RabbitMQ queues.
- `QueuePattern("orders.*")` mapped to RabbitMQ topic bindings.
- Retry and dead-letter flow through `maxRetries`, `retryDelay`, and `deadLetterQueue`.
- `InjectQueueService()` and `PublishToQueue()` with a broker-backed transport.

## Notes

- `POST /queues/orders/:id/fail` publishes a message that throws on the first delivery attempt so you can see retry metadata and the handler recover on the next attempt.
- The sample also consumes `orders.dead` so exhausted messages are visible in the runtime status payload.
- Stop RabbitMQ with `npm run rabbitmq:down` when you are finished.