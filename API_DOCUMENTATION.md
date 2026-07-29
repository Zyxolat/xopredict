# XoPredict — API Endpoints Documentation

## Auth V2 Endpoints

### `POST /api/auth/register`
- **Description**: Registers a new user account.
- **Body**: `{ email: string, username: string, displayName?: string, password: string }`
- **Response**: `201 Created`

### `POST /api/auth/verify-email`
- **Description**: Verifies account email with 6-digit OTP.
- **Body**: `{ email: string, otp: string }`
- **Response**: `200 OK`

### `PUT /api/auth/verify-email`
- **Description**: Resends 6-digit OTP (60s cooldown).
- **Body**: `{ email: string }`
- **Response**: `200 OK`

### `GET /api/auth/check-username?username=xxx`
- **Description**: Checks username availability.
- **Response**: `{ available: boolean, error?: string }`

### `POST /api/auth/forgot-password`
- **Description**: Triggers password reset OTP email.
- **Body**: `{ email: string }`
- **Response**: `200 OK`

### `POST /api/auth/reset-password`
- **Description**: Resets password using OTP.
- **Body**: `{ email: string, otp: string, newPassword: string }`
- **Response**: `200 OK`

### `POST /api/auth/change-password`
- **Description**: Changes password for authenticated user.
- **Body**: `{ currentPassword: string, newPassword: string }`
- **Response**: `200 OK`

### `GET /api/auth/wallet`
- **Description**: Generates signing nonce for wallet linking.
- **Response**: `{ nonce: string, message: string }`

### `POST /api/auth/wallet` or `POST /api/wallet/connect`
- **Description**: Verifies signature & links wallet to account.
- **Body**: `{ address: string, signature: string, nonce: string }`
- **Response**: `200 OK` or `409 Conflict`

### `DELETE /api/auth/wallets` or `POST /api/wallet/disconnect`
- **Description**: Unlinks wallet from account.
- **Body**: `{ address: string }`
- **Response**: `200 OK`

### `GET /api/profile` & `PATCH /api/profile`
- **Description**: Profile management endpoints.
- **Body (PATCH)**: `{ displayName?: string, bio?: string, avatarUrl?: string }`
