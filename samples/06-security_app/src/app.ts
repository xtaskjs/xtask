import "reflect-metadata";
import { CreateApplication } from "@xtaskjs/core";
import {
  SecurityValidationContext,
  registerJweStrategy,
  registerJwtStrategy,
} from "@xtaskjs/security";
import { SAMPLE_JWE_SECRET, SAMPLE_JWT_SECRET, SAMPLE_TENANT } from "./security.config";
import { UserDirectoryService } from "./user-directory.service";

const resolveValidatedUser = async (
  payload: Record<string, any>,
  context: SecurityValidationContext
) => {
  if (payload.tenant !== SAMPLE_TENANT) {
    return false;
  }

  const directory = context.container?.get(UserDirectoryService);
  const user = directory?.findActiveUser(String(payload.sub || ""));
  if (!user) {
    return false;
  }

  return {
    sub: user.id,
    name: user.name,
    roles: user.roles,
    claims: payload,
  };
};

registerJwtStrategy({
  name: "default",
  default: true,
  secretOrKey: SAMPLE_JWT_SECRET,
  validate: resolveValidatedUser,
});

registerJweStrategy({
  name: "encrypted",
  decryptionKey: SAMPLE_JWE_SECRET,
  validate: resolveValidatedUser,
});

async function main() {
  await CreateApplication({
    adapter: "node-http",
    autoListen: true,
    server: {
      host: "127.0.0.1",
      port: Number(process.env.PORT || 3000),
    },
  });
}

main().catch((error) => {
  console.error("Error starting the security sample:", error);
});