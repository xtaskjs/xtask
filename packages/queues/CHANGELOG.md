# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## 1.0.5 (2026-04-06)

**Note:** Version bump only for package @xtaskjs/queues





## 1.0.1 (2026-03-21)

- Add broker helper factories for RabbitMQ and MQTT on top of the generic queue transport contract.
- Add delayed retries, dead-letter routing, and competing-consumer policies across the queue runtime and helper transports.
- Add broker-specific dead-letter exchange options, QoS defaults, MQTT retain defaults, and reconnect hooks for RabbitMQ and MQTT helpers.

## 1.0.0 (2026-03-21)

- Add queues package with transport-agnostic publishers, handlers, lifecycle integration, and an in-memory transport.
