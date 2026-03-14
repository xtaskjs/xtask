import { createDecipheriv } from "crypto";
import { Strategy as PassportStrategyBase } from "passport-strategy";
import {
  RegisteredJweSecurityStrategyOptions,
  RegisteredSecurityStrategyOptions,
  SecurityValidationContext,
} from "./types";

export const defaultBearerTokenExtractor = (request: any): string | null => {
  const headerValue =
    request?.headers?.authorization ||
    request?.headers?.Authorization ||
    request?.authorization;

  if (typeof headerValue !== "string") {
    return null;
  }

  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
};

const decodeBase64Url = (value: string): Buffer => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64");
};

const decodeJsonSegment = (value: string): Record<string, any> => {
  return ensureRecord(JSON.parse(decodeBase64Url(value).toString("utf-8")));
};

const normalizeDecryptionKey = (value: any): Buffer => {
  if (Buffer.isBuffer(value)) {
    return value;
  }

  if (value instanceof Uint8Array) {
    return Buffer.from(value);
  }

  return Buffer.from(String(value), "utf-8");
};

const toUnixTime = (): number => Math.floor(Date.now() / 1000);

const toClockToleranceSeconds = (value?: number | string): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const normalizeAudience = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (typeof value === "string") {
    return [value];
  }
  return [];
};

const validateJweClaims = (
  payload: Record<string, any>,
  definition: RegisteredJweSecurityStrategyOptions
): void => {
  const now = toUnixTime();
  const clockTolerance = toClockToleranceSeconds(definition.clockTolerance);

  if (typeof payload.exp === "number" && now - clockTolerance >= payload.exp) {
    throw new Error("Token expired");
  }

  if (typeof payload.nbf === "number" && now + clockTolerance < payload.nbf) {
    throw new Error("Token is not active yet");
  }

  if (definition.issuer) {
    const expectedIssuers = Array.isArray(definition.issuer)
      ? definition.issuer
      : [definition.issuer];
    if (!expectedIssuers.includes(String(payload.iss || ""))) {
      throw new Error("Token issuer is not allowed");
    }
  }

  if (definition.audience) {
    const expectedAudiences = Array.isArray(definition.audience)
      ? definition.audience
      : [definition.audience];
    const actualAudiences = normalizeAudience(payload.aud);
    const hasAudience = expectedAudiences.some((audience) => actualAudiences.includes(audience));
    if (!hasAudience) {
      throw new Error("Token audience is not allowed");
    }
  }
};

const ensureRecord = (value: any): Record<string, any> => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  return {};
};

export const resolveValidatedUser = async (
  definition: RegisteredSecurityStrategyOptions,
  payload: Record<string, any>,
  context: SecurityValidationContext
): Promise<any | false> => {
  if (!definition.validate) {
    return payload;
  }

  return definition.validate(payload, context);
};

const toJweKey = async (definition: RegisteredJweSecurityStrategyOptions): Promise<any> => {
  const key =
    typeof definition.resolveDecryptionKey === "function"
      ? await definition.resolveDecryptionKey()
      : definition.decryptionKey;

  if (typeof key === "string") {
    return new TextEncoder().encode(key);
  }

  return key;
};

export class JweStrategy extends PassportStrategyBase {
  declare public readonly name: string;
  declare public success: (user: any, info?: any) => void;
  declare public fail: (challenge?: any, status?: number) => void;
  declare public error: (error: Error) => void;
  declare public pass: () => void;
  private readonly definition: RegisteredJweSecurityStrategyOptions;
  private readonly resolveValidationContext?: () => Partial<SecurityValidationContext>;

  constructor(
    definition: RegisteredJweSecurityStrategyOptions,
    resolveValidationContext?: () => Partial<SecurityValidationContext>
  ) {
    super();
    this.definition = definition;
    this.name = definition.name;
    this.resolveValidationContext = resolveValidationContext;
  }

  authenticate(request: any): void {
    void this.run(request);
  }

  private async run(request: any): Promise<void> {
    const extractor = this.definition.jwtFromRequest || defaultBearerTokenExtractor;
    const token = extractor(request);

    if (!token) {
      this.fail({ message: "Missing bearer token" }, 401);
      return;
    }

    try {
      const [protectedHeader, encryptedKey, iv, ciphertext, tag] = token.split(".");
      if (!protectedHeader || encryptedKey === undefined || !iv || !ciphertext || !tag) {
        throw new Error("Malformed JWE token");
      }

      const header = decodeJsonSegment(protectedHeader);
      if (header.alg !== "dir") {
        throw new Error(`Unsupported JWE alg '${String(header.alg || "")}'`);
      }

      if (header.enc !== "A256GCM") {
        throw new Error(`Unsupported JWE enc '${String(header.enc || "")}'`);
      }

      if (encryptedKey.length > 0) {
        throw new Error("Compact JWE with direct encryption must not include an encrypted key segment");
      }

      const key = normalizeDecryptionKey(await toJweKey(this.definition));
      if (key.length !== 32) {
        throw new Error("JWE decryption key must be 32 bytes for dir/A256GCM tokens");
      }

      const decipher = createDecipheriv("aes-256-gcm", key, decodeBase64Url(iv));
      decipher.setAAD(Buffer.from(protectedHeader, "utf-8"));
      decipher.setAuthTag(decodeBase64Url(tag));
      const plaintext = Buffer.concat([
        decipher.update(decodeBase64Url(ciphertext)),
        decipher.final(),
      ]);
      const payload = ensureRecord(JSON.parse(plaintext.toString("utf-8")));
      validateJweClaims(payload, this.definition);
      const user = await resolveValidatedUser(this.definition, payload, {
        ...this.resolveValidationContext?.(),
        request,
        token,
        strategyName: this.definition.name,
        kind: this.definition.kind,
      });

      if (!user) {
        this.fail({ message: "Unauthorized", claims: payload }, 401);
        return;
      }

      this.success(user, {
        claims: payload,
        protectedHeader: header,
        strategy: this.definition.name,
        kind: this.definition.kind,
      });
    } catch (error: any) {
      const message = typeof error?.message === "string" ? error.message : "Unauthorized";
      this.fail({ message }, 401);
    }
  }
}