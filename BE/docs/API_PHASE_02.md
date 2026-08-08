# Authentication API examples

## Register

```http
POST /api/v1/auth/register
Content-Type: application/json
```

```json
{
  "fullName": "Nguyễn Văn A",
  "identifier": "student@example.com",
  "password": "Password1",
  "termsAccepted": true
}
```

## Login

```json
{
  "identifier": "student@example.com",
  "password": "Password1"
}
```

## Google login

Send the `credential` returned by Google Identity Services:

```json
{
  "credential": "<google-id-token>"
}
```

## Refresh

```json
{
  "refreshToken": "<opaque-refresh-token>"
}
```

## Swagger authorization

Call login/register, copy `result.tokens.accessToken`, click **Authorize**, and paste only the token value. Swagger adds the `Bearer` prefix automatically.
