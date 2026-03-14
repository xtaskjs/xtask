# 06-security_app

Node HTTP sample application using `@xtaskjs/security` with JWT and JWE authentication.

## Run

```bash
npm install
npm start
```

From this folder: `samples/06-security_app`.

## Test URLs

- Anonymous health endpoint:
  - http://127.0.0.1:3000/health/
- Issue a JWT for the admin demo user:
  - http://127.0.0.1:3000/auth/jwt/admin
- Issue a JWT for the viewer demo user:
  - http://127.0.0.1:3000/auth/jwt/viewer
- Issue a JWE for the admin demo user:
  - http://127.0.0.1:3000/auth/jwe/admin
- JWT-protected profile route:
  - http://127.0.0.1:3000/me/
- JWT-protected admin route:
  - http://127.0.0.1:3000/admin/
- JWE-protected route:
  - http://127.0.0.1:3000/encrypted/

## Example Flow

1. Open `/auth/jwt/admin` and copy the returned token.
2. Call `/me/` with `Authorization: Bearer <token>`.
3. Call `/admin/` with the same token.
4. Open `/auth/jwe/admin` and call `/encrypted/` with the returned token.

Example with `curl`:

```bash
JWT_TOKEN=$(curl -s http://127.0.0.1:3000/auth/jwt/admin | node -e 'process.stdin.on("data", d => console.log(JSON.parse(d).token))')
curl -H "Authorization: Bearer $JWT_TOKEN" http://127.0.0.1:3000/me/
curl -H "Authorization: Bearer $JWT_TOKEN" http://127.0.0.1:3000/admin/
```

## Notes

- The sample uses strategy `validate` callbacks to enforce the `security-sample` tenant claim.
- User lookup is resolved from the XTaskJS DI container inside the validate callback.
- The JWE example uses compact `dir` + `A256GCM`, matching the current package support.