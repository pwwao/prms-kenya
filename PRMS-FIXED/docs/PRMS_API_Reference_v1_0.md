# PRMS — Complete API Reference Documentation
## Patient Referral Management System (Kenya)

**Version:** 1.0.0
**Base URL:** `https://api.prms.health.go.ke/api/v1`
**Protocol:** HTTPS only (TLS 1.3)
**Format:** JSON
**Date:** June 10, 2026

---

> **For Teams Using This Document**
> - **Web Admin Team** — consume all endpoints marked Web
> - **Mobile Team** — consume all endpoints marked Mobile
> - **Integration Team** — verify every endpoint is implemented and matches this spec
> - **Backend Team** — implement every endpoint exactly as defined here

---

## AUTHENTICATION

Every protected endpoint requires this header:
```
Authorization: Bearer <access_token>
Content-Type: application/json
X-Request-ID: <uuid-v4>
```

Token lifetime:
- Access token: **15 minutes**
- Refresh token: **7 days**

---

## STANDARD RESPONSE ENVELOPE

Every response — success or error — uses this exact shape.

### Success
```json
{
  "success": true,
  "data": { },
  "message": "Operation completed successfully",
  "meta": {
    "timestamp": "2026-06-10T10:00:00.000Z",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Paginated Success
```json
{
  "success": true,
  "data": [ ],
  "message": "Records retrieved",
  "meta": {
    "timestamp": "2026-06-10T10:00:00.000Z",
    "requestId": "uuid",
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed for request body",
    "details": [
      { "field": "urgencyLevel", "message": "Must be one of: Routine, Urgent, Emergent" }
    ]
  },
  "meta": {
    "timestamp": "2026-06-10T10:00:00.000Z",
    "requestId": "uuid"
  }
}
```

---

## HTTP STATUS CODES

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Resource created |
| `204` | Success, no content (DELETE) |
| `400` | Validation error |
| `401` | Missing or expired token |
| `403` | Valid token, insufficient role |
| `404` | Resource not found |
| `409` | Duplicate resource |
| `422` | Business rule violation |
| `429` | Rate limit exceeded |
| `500` | Internal server error |
| `503` | External service unavailable |

---

---

# MODULE 1 — AUTHENTICATION

---

## POST `/auth/login`

Authenticate using username or email. Returns a pre-auth token when 2FA is enabled, or a full access token if 2FA is disabled.

**Auth required:** None (public)
**Rate limit:** 5 attempts per 15 minutes per IP

**Request Body**
```json
{
  "identifier": "dr.waweru",
  "password": "SecurePassword123!"
}
```

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `identifier` | string | ✅ | Username or email address |
| `password` | string | ✅ | Min 12 chars |

**Response 200 — 2FA Required**
```json
{
  "success": true,
  "data": {
    "status": "2FA_REQUIRED",
    "preAuthToken": "eyJhbGciOiJSUzI1NiJ9...",
    "deliveryMethod": "TOTP"
  },
  "message": "2FA verification required",
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

**Response 200 — 2FA Disabled (direct login)**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiJ9...",
    "refreshToken": "eyJhbGciOiJSUzI1NiJ9...",
    "expiresIn": 900,
    "user": {
      "id": 23,
      "username": "dr.waweru",
      "fullName": "Dr. James Waweru",
      "role": "Clinician",
      "hospitalId": 7,
      "hospitalName": "Kisumu County Hospital",
      "isFirstLogin": false
    }
  },
  "message": "Login successful",
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

**Error Responses**

| Code | error.code | Scenario |
|------|-----------|---------|
| `401` | `AUTH_INVALID_CREDENTIALS` | Wrong username/email or password |
| `403` | `AUTH_ACCOUNT_SUSPENDED` | Account or hospital is suspended |
| `403` | `AUTH_ACCOUNT_INACTIVE` | Account is inactive |
| `429` | `RATE_LIMIT_EXCEEDED` | Too many attempts |

---

## POST `/auth/verify-2fa`

Submit the 6-digit OTP to complete login after 2FA challenge.

**Auth required:** None (uses preAuthToken)
**Rate limit:** 3 attempts per 5 minutes

**Request Body**
```json
{
  "preAuthToken": "eyJhbGciOiJSUzI1NiJ9...",
  "otpCode": "584920"
}
```

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `preAuthToken` | string | ✅ | Token from `/auth/login` |
| `otpCode` | string | ✅ | Exactly 6 digits |

**Response 200 — Success**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiJ9...",
    "refreshToken": "eyJhbGciOiJSUzI1NiJ9...",
    "expiresIn": 900,
    "user": {
      "id": 23,
      "username": "dr.waweru",
      "fullName": "Dr. James Waweru",
      "role": "Clinician",
      "hospitalId": 7,
      "hospitalName": "Kisumu County Hospital",
      "isFirstLogin": false
    }
  },
  "message": "Login successful",
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

**Error Responses**

| Code | error.code | Scenario |
|------|-----------|---------|
| `401` | `AUTH_2FA_INVALID_OTP` | Wrong OTP code |
| `401` | `AUTH_TOKEN_EXPIRED` | Pre-auth token expired (>5 min) |
| `401` | `AUTH_TOKEN_INVALID` | Pre-auth token tampered |

---

## POST `/auth/refresh`

Exchange a valid refresh token for a new access token.

**Auth required:** None (uses refresh token in body)

**Request Body**
```json
{
  "refreshToken": "eyJhbGciOiJSUzI1NiJ9..."
}
```

**Response 200 — Success**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiJ9...",
    "expiresIn": 900
  },
  "message": "Token refreshed",
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

**Error Responses**

| Code | error.code | Scenario |
|------|-----------|---------|
| `401` | `AUTH_REFRESH_TOKEN_EXPIRED` | Refresh token expired (>7 days) |
| `401` | `AUTH_TOKEN_INVALID` | Refresh token revoked or invalid |

---

## POST `/auth/logout`

Revoke the current access and refresh tokens.

**Auth required:** Any authenticated user

**Request Body**
```json
{
  "refreshToken": "eyJhbGciOiJSUzI1NiJ9..."
}
```

**Response 200 — Success**
```json
{
  "success": true,
  "data": null,
  "message": "Logged out successfully",
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

---

## POST `/auth/forgot-password`

Request a password reset link via email. Always returns 200 to prevent email enumeration.

**Auth required:** None (public)
**Rate limit:** 3 attempts per 60 minutes per IP

**Request Body**
```json
{
  "email": "dr.waweru@hospital.co.ke"
}
```

**Response 200 — Always**
```json
{
  "success": true,
  "data": null,
  "message": "If an account exists for this email, a reset link has been sent.",
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

---

## POST `/auth/reset-password`

Complete password reset using the token from the email link.

**Auth required:** None (uses reset token)

**Request Body**
```json
{
  "resetToken": "abc123def456...",
  "newPassword": "NewSecurePassword123!",
  "confirmPassword": "NewSecurePassword123!"
}
```

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `resetToken` | string | ✅ | From password reset email |
| `newPassword` | string | ✅ | Min 12 chars, uppercase, lowercase, number, special char |
| `confirmPassword` | string | ✅ | Must match newPassword |

**Response 200 — Success**
```json
{
  "success": true,
  "data": null,
  "message": "Password reset successfully. Please log in.",
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

**Error Responses**

| Code | error.code | Scenario |
|------|-----------|---------|
| `401` | `AUTH_TOKEN_EXPIRED` | Reset token expired (>15 min) |
| `401` | `AUTH_TOKEN_INVALID` | Reset token already used or tampered |
| `400` | `VALIDATION_ERROR` | Passwords don't match or too weak |

---

## GET `/auth/me`

Get the currently authenticated user's profile.

**Auth required:** Any authenticated user

**Response 200 — Success**
```json
{
  "success": true,
  "data": {
    "id": 23,
    "username": "dr.waweru",
    "fullName": "Dr. James Waweru",
    "email": "dr.waweru@hospital.co.ke",
    "phoneNumber": "+254712345678",
    "role": "Clinician",
    "hospitalId": 7,
    "hospitalName": "Kisumu County Hospital",
    "facilityLevel": "Level 4",
    "county": "Kisumu",
    "isTwoFactorEnabled": true,
    "status": "Active",
    "createdAt": "2026-01-15T08:00:00.000Z"
  },
  "message": "Profile retrieved",
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

---

## PATCH `/auth/change-password`

Change the authenticated user's own password. Also clears `isFirstLogin` flag.

**Auth required:** Any authenticated user

**Request Body**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewSecurePassword456!",
  "confirmPassword": "NewSecurePassword456!"
}
```

**Response 200 — Success**
```json
{
  "success": true,
  "data": null,
  "message": "Password changed successfully.",
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

---

## POST `/auth/register-device`

Register a mobile device FCM token for push notifications. Call on every app launch after login.

**Auth required:** Any authenticated user (Mobile only)

**Request Body**
```json
{
  "fcmToken": "fMEZnP5Ydck:APA91bHPRg...",
  "deviceId": "550e8400-e29b-41d4-a716-446655440001",
  "platform": "android"
}
```

| Field | Type | Required | Values |
|-------|------|----------|--------|
| `fcmToken` | string | ✅ | Firebase device token |
| `deviceId` | string | ✅ | Unique device UUID |
| `platform` | string | ✅ | `android` or `ios` |

**Response 200 — Success**
```json
{
  "success": true,
  "data": null,
  "message": "Device registered for notifications",
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

---

---

# MODULE 2 — HOSPITALS

---

## POST `/hospitals`

Register a new hospital. Creates a Pending application for System Admin review.

**Auth required:** None (public)

**Request Body**
```json
{
  "mohCode": "KNH-2024-001",
  "name": "Kenyatta National Hospital",
  "facilityLevel": "Level 6",
  "county": "Nairobi",
  "subCounty": "Westlands",
  "adminFullName": "Dr. James Ochieng",
  "adminEmail": "j.ochieng@knh.co.ke",
  "adminPhone": "+254712345678",
  "adminUsername": "james.ochieng"
}
```

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `mohCode` | string | ✅ | Must be unique. Format: `XXX-YYYY-NNN` |
| `name` | string | ✅ | 3–150 chars |
| `facilityLevel` | string | ✅ | `Level 2`, `Level 3`, `Level 4`, `Level 5`, `Level 6` |
| `county` | string | ✅ | Must be a valid Kenya county |
| `subCounty` | string | ✅ | |
| `adminFullName` | string | ✅ | First and last name |
| `adminEmail` | string | ✅ | Valid email, must be unique |
| `adminPhone` | string | ✅ | Valid Kenyan number: `+2547XXXXXXXX` |
| `adminUsername` | string | ✅ | 4–50 chars, alphanumeric and underscores only |

**Response 201 — Created**
```json
{
  "success": true,
  "data": {
    "hospitalId": 14,
    "status": "Pending",
    "message": "Application submitted. You will be notified once reviewed."
  },
  "message": "Hospital registration submitted successfully",
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

**Error Responses**

| Code | error.code | Scenario |
|------|-----------|---------|
| `409` | `RESOURCE_ALREADY_EXISTS` | MoH code or admin email already registered |
| `400` | `VALIDATION_ERROR` | Invalid field value |

---

## GET `/hospitals`

List all hospitals with optional status filter. System Admin only.

**Auth required:** System Admin
**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | string | ❌ | `Pending`, `Approved`, `Suspended` |
| `county` | string | ❌ | Filter by county |
| `facilityLevel` | string | ❌ | `Level 2`–`Level 6` |
| `q` | string | ❌ | Search by name or MoH code |
| `page` | integer | ❌ | Default: 1 |
| `limit` | integer | ❌ | Default: 20, max: 100 |
| `sortBy` | string | ❌ | `created_at`, `name` — default: `created_at` |
| `sortDir` | string | ❌ | `asc`, `desc` — default: `desc` |

**Response 200 — Success**
```json
{
  "success": true,
  "data": [
    {
      "id": 14,
      "mohCode": "KNH-2024-001",
      "name": "Kenyatta National Hospital",
      "facilityLevel": "Level 6",
      "county": "Nairobi",
      "subCounty": "Westlands",
      "status": "Pending",
      "createdAt": "2026-06-05T09:00:00.000Z",
      "updatedAt": "2026-06-05T09:00:00.000Z"
    }
  ],
  "message": "Hospitals retrieved",
  "meta": {
    "timestamp": "...",
    "requestId": "...",
    "pagination": {
      "page": 1, "limit": 20, "total": 87,
      "totalPages": 5, "hasNext": true, "hasPrev": false
    }
  }
}
```

---

## GET `/hospitals/:hospitalId`

Get a single hospital's full details.

**Auth required:** System Admin, Hospital Admin (own hospital only)

**Path Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `hospitalId` | integer | Hospital ID |

**Response 200 — Success**
```json
{
  "success": true,
  "data": {
    "id": 14,
    "mohCode": "KNH-2024-001",
    "name": "Kenyatta National Hospital",
    "facilityLevel": "Level 6",
    "county": "Nairobi",
    "subCounty": "Westlands",
    "status": "Approved",
    "totalStaff": 42,
    "totalReferralsIn": 1204,
    "totalReferralsOut": 89,
    "createdAt": "2026-01-10T08:00:00.000Z",
    "updatedAt": "2026-06-10T09:00:00.000Z"
  },
  "message": "Hospital retrieved",
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

**Error Responses**

| Code | error.code | Scenario |
|------|-----------|---------|
| `404` | `RESOURCE_NOT_FOUND` | Hospital ID does not exist |
| `403` | `AUTH_INSUFFICIENT_PERMISSIONS` | Hospital Admin accessing another facility |

---

## PATCH `/hospitals/:hospitalId/status`

Change a hospital's status. System Admin only.

**Auth required:** System Admin

**Request Body**
```json
{
  "status": "Approved",
  "reason": "All documents verified and MoH code confirmed."
}
```

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `status` | string | ✅ | `Approved`, `Suspended`, `Pending` |
| `reason` | string | Conditional | Required when status is `Rejected` or `Suspended` |

**Valid transitions:**

| From | To | Allowed |
|------|----|---------|
| Pending | Approved | ✅ |
| Pending | Rejected | ✅ |
| Approved | Suspended | ✅ |
| Suspended | Approved | ✅ |
| Rejected | Pending | ✅ |

**Response 200 — Success**
```json
{
  "success": true,
  "data": {
    "id": 14,
    "status": "Approved",
    "updatedAt": "2026-06-10T10:00:00.000Z"
  },
  "message": "Hospital status updated successfully",
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

**Error Responses**

| Code | error.code | Scenario |
|------|-----------|---------|
| `422` | `RESOURCE_INVALID_STATE_TRANSITION` | Invalid status transition |
| `400` | `VALIDATION_ERROR` | Reason missing for Suspended/Rejected |

---

---

# MODULE 3 — USERS

---

## GET `/users`

List all users within the authenticated Hospital Admin's facility.

**Auth required:** Hospital Admin

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | string | ❌ | `Active`, `Inactive`, `Suspended` |
| `role` | string | ❌ | `Clinician`, `Receptionist` |
| `q` | string | ❌ | Search by name or username |
| `page` | integer | ❌ | Default: 1 |
| `limit` | integer | ❌ | Default: 20 |

**Response 200 — Success**
```json
{
  "success": true,
  "data": [
    {
      "id": 23,
      "username": "dr.waweru",
      "fullName": "Dr. James Waweru",
      "email": "dr.waweru@hospital.co.ke",
      "phoneNumber": "+254712345678",
      "role": "Clinician",
      "status": "Active",
      "isTwoFactorEnabled": true,
      "lastLoginAt": "2026-06-10T08:30:00.000Z",
      "createdAt": "2026-01-15T08:00:00.000Z"
    }
  ],
  "message": "Users retrieved",
  "meta": { "timestamp": "...", "requestId": "...", "pagination": { } }
}
```

---

## POST `/users`

Create a new Clinician or Receptionist account within the authenticated admin's facility. A temporary password is emailed to the new user.

**Auth required:** Hospital Admin

**Request Body**
```json
{
  "fullName": "Dr. Amina Okal",
  "username": "amina.okal",
  "email": "amina.okal@hospital.co.ke",
  "phoneNumber": "+254723456789",
  "role": "Clinician"
}
```

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `fullName` | string | ✅ | 2–150 chars |
| `username` | string | ✅ | 4–50 chars, alphanumeric + underscores, unique globally |
| `email` | string | ✅ | Valid email, unique globally |
| `phoneNumber` | string | ✅ | Valid Kenyan: `+2547XXXXXXXX` |
| `role` | string | ✅ | `Clinician` or `Receptionist` |

**Response 201 — Success**
```json
{
  "success": true,
  "data": {
    "id": 45,
    "username": "amina.okal",
    "fullName": "Dr. Amina Okal",
    "role": "Clinician",
    "status": "Active",
    "isFirstLogin": true,
    "createdAt": "2026-06-10T10:00:00.000Z"
  },
  "message": "User created. Login credentials sent to amina.okal@hospital.co.ke",
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

**Error Responses**

| Code | error.code | Scenario |
|------|-----------|---------|
| `409` | `RESOURCE_ALREADY_EXISTS` | Username or email taken |
| `400` | `VALIDATION_ERROR` | Invalid field |

---

## GET `/users/:userId`

Get a single user's profile. Hospital Admin sees own facility's staff only.

**Auth required:** Hospital Admin

**Response 200 — Success**
```json
{
  "success": true,
  "data": {
    "id": 45,
    "username": "amina.okal",
    "fullName": "Dr. Amina Okal",
    "email": "amina.okal@hospital.co.ke",
    "phoneNumber": "+254723456789",
    "role": "Clinician",
    "hospitalId": 7,
    "status": "Active",
    "isTwoFactorEnabled": false,
    "isFirstLogin": false,
    "lastLoginAt": "2026-06-09T14:00:00.000Z",
    "createdAt": "2026-06-10T10:00:00.000Z"
  },
  "message": "User retrieved",
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

---

## PATCH `/users/:userId`

Update a user's profile details (name, phone, email).

**Auth required:** Hospital Admin

**Request Body**
```json
{
  "fullName": "Dr. Amina Okal Mwangi",
  "phoneNumber": "+254799999999",
  "email": "amina.new@hospital.co.ke"
}
```
All fields are optional. Send only what needs updating.

**Response 200 — Success**
```json
{
  "success": true,
  "data": {
    "id": 45,
    "fullName": "Dr. Amina Okal Mwangi",
    "email": "amina.new@hospital.co.ke",
    "updatedAt": "2026-06-10T11:00:00.000Z"
  },
  "message": "User updated successfully",
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

---

## PATCH `/users/:userId/status`

Activate or suspend a user account. Immediately logs out active sessions.

**Auth required:** Hospital Admin

**Request Body**
```json
{
  "status": "Suspended",
  "reason": "Staff member on administrative leave"
}
```

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `status` | string | ✅ | `Active` or `Suspended` |
| `reason` | string | Conditional | Required when suspending |

**Response 200 — Success**
```json
{
  "success": true,
  "data": {
    "id": 45,
    "status": "Suspended",
    "updatedAt": "2026-06-10T11:00:00.000Z"
  },
  "message": "User status updated. Active sessions terminated.",
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

---

---

# MODULE 4 — PATIENTS

---

## POST `/patients`

Register a new patient. Backend encrypts PII before storage.

**Auth required:** Clinician, Receptionist

**Request Body**
```json
{
  "idType": "National ID",
  "nationalId": "23456789",
  "fullName": "Jane Wambui Mwangi",
  "gender": "Female",
  "dateOfBirth": "1992-03-12",
  "county": "Nairobi",
  "phoneNumber": "+254712345678"
}
```

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `idType` | string | ✅ | `National ID`, `Alien ID`, `Birth Certificate` |
| `nationalId` | string | ✅ | Unique per idType combination |
| `fullName` | string | ✅ | 2–200 chars |
| `gender` | string | ✅ | `Male`, `Female`, `Other` |
| `dateOfBirth` | string | ✅ | ISO 8601 date (`YYYY-MM-DD`) |
| `county` | string | ✅ | Valid Kenya county |
| `phoneNumber` | string | ❌ | Valid Kenyan number |

**Response 201 — Success**
```json
{
  "success": true,
  "data": {
    "id": 4501,
    "gender": "Female",
    "county": "Nairobi",
    "createdAt": "2026-06-10T10:00:00.000Z",
    "maskedRecord": {
      "fullName": "Jane W. M.",
      "nationalId": "XXXX6789",
      "phoneNumber": "071XXXX678"
    }
  },
  "message": "Patient registered successfully",
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

**Error Responses**

| Code | error.code | Scenario |
|------|-----------|---------|
| `409` | `RESOURCE_ALREADY_EXISTS` | Patient with this ID already registered |

---

## GET `/patients`

Search patients by ID hash or masked name. Returns role-appropriate data.

**Auth required:** Clinician, Receptionist

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | ✅ | Search term — ID number or partial name |
| `page` | integer | ❌ | Default: 1 |
| `limit` | integer | ❌ | Default: 20, max: 50 |

**Response 200 — Clinician (unmasked)**
```json
{
  "success": true,
  "data": [
    {
      "id": 4501,
      "fullName": "Jane Wambui Mwangi",
      "nationalId": "23456789",
      "gender": "Female",
      "dateOfBirth": "1992-03-12",
      "age": 34,
      "county": "Nairobi",
      "phoneNumber": "+254712345678",
      "createdAt": "2026-06-10T10:00:00.000Z"
    }
  ],
  "message": "Patients retrieved",
  "meta": { "timestamp": "...", "requestId": "...", "pagination": { } }
}
```

**Response 200 — Receptionist (masked)**
```json
{
  "success": true,
  "data": [
    {
      "id": 4501,
      "fullName": "Jane W. M.",
      "nationalId": "XXXX6789",
      "gender": "Female",
      "age": 34,
      "county": "Nairobi",
      "phoneNumber": "071XXXX678"
    }
  ],
  "message": "Patients retrieved",
  "meta": { "timestamp": "...", "requestId": "...", "pagination": { } }
}
```

> The API returns the correct data shape based on the authenticated user's role. The frontend does NOT need to mask — the backend does it.

---

## GET `/patients/:patientId`

Get a single patient record. Returns role-appropriate data.

**Auth required:** Clinician, Receptionist

**Response 200 — Success** (same shape as list item above, single object)

**Error Responses**

| Code | error.code | Scenario |
|------|-----------|---------|
| `404` | `RESOURCE_NOT_FOUND` | Patient not found |

---

---

# MODULE 5 — REFERRALS

---

## POST `/referrals`

Create a new referral in Draft status.

**Auth required:** Clinician

**Request Body**
```json
{
  "patientId": 4501,
  "destinationHospitalId": 14,
  "urgencyLevel": "Urgent",
  "reasonForReferral": "Suspected cardiac arrhythmia requiring echocardiography and specialist evaluation.",
  "clinicalSummary": "Patient presenting with irregular heartbeat on auscultation at 94 bpm irregular. BP 150/95. On enalapril 5mg daily for 6 months."
}
```

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `patientId` | integer | ✅ | Must exist |
| `destinationHospitalId` | integer | ✅ | Must be Approved, cannot be own hospital |
| `urgencyLevel` | string | ✅ | `Routine`, `Urgent`, `Emergent` |
| `reasonForReferral` | string | ✅ | Min 20 chars |
| `clinicalSummary` | string | ✅ | Min 50 chars — encrypted at rest |

**Response 201 — Success**
```json
{
  "success": true,
  "data": {
    "id": 981,
    "referralCode": "REF-2026-00981",
    "status": "Draft",
    "urgencyLevel": "Urgent",
    "patientId": 4501,
    "sourceHospitalId": 7,
    "sourceHospitalName": "Kisumu County Hospital",
    "destinationHospitalId": 14,
    "destinationHospitalName": "Kenyatta National Hospital",
    "createdByUserId": 23,
    "createdAt": "2026-06-10T10:00:00.000Z"
  },
  "message": "Referral created as draft",
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

**Error Responses**

| Code | error.code | Scenario |
|------|-----------|---------|
| `404` | `RESOURCE_NOT_FOUND` | Patient or destination hospital not found |
| `422` | `RESOURCE_INVALID_STATE_TRANSITION` | Destination is own hospital |
| `403` | `AUTH_HOSPITAL_SUSPENDED` | Destination hospital is suspended |

---

## GET `/referrals`

List referrals scoped to the authenticated user's facility. Clinicians and Receptionists see only referrals where their hospital is the source or destination.

**Auth required:** Clinician, Receptionist

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `direction` | string | ❌ | `incoming`, `outgoing` — default: both |
| `status` | string | ❌ | `Draft`, `Dispatched`, `Received`, `Accepted`, `Rejected`, `Completed` |
| `urgencyLevel` | string | ❌ | `Routine`, `Urgent`, `Emergent` |
| `q` | string | ❌ | Search by referral code |
| `page` | integer | ❌ | Default: 1 |
| `limit` | integer | ❌ | Default: 20 |
| `sortBy` | string | ❌ | `created_at`, `updated_at` |
| `sortDir` | string | ❌ | `asc`, `desc` — default: `desc` |

**Response 200 — Success**
```json
{
  "success": true,
  "data": [
    {
      "id": 981,
      "referralCode": "REF-2026-00981",
      "status": "Dispatched",
      "urgencyLevel": "Urgent",
      "direction": "outgoing",
      "patient": {
        "id": 4501,
        "displayName": "Jane W. M.",
        "gender": "Female",
        "age": 34
      },
      "sourceHospital": {
        "id": 7,
        "name": "Kisumu County Hospital",
        "facilityLevel": "Level 4"
      },
      "destinationHospital": {
        "id": 14,
        "name": "Kenyatta National Hospital",
        "facilityLevel": "Level 6"
      },
      "createdAt": "2026-06-10T09:00:00.000Z",
      "updatedAt": "2026-06-10T09:15:00.000Z"
    }
  ],
  "message": "Referrals retrieved",
  "meta": { "timestamp": "...", "requestId": "...", "pagination": { } }
}
```

---

## GET `/referrals/:referralId`

Get full referral details including patient data (role-masked), clinical summary, and timeline.

**Auth required:** Clinician, Receptionist (own facility only)

**Response 200 — Clinician**
```json
{
  "success": true,
  "data": {
    "id": 981,
    "referralCode": "REF-2026-00981",
    "status": "Received",
    "urgencyLevel": "Urgent",
    "reasonForReferral": "Suspected cardiac arrhythmia requiring evaluation.",
    "clinicalSummary": "Patient presenting with irregular heartbeat at 94 bpm...",
    "rejectionReason": null,
    "patient": {
      "id": 4501,
      "fullName": "Jane Wambui Mwangi",
      "nationalId": "23456789",
      "gender": "Female",
      "dateOfBirth": "1992-03-12",
      "age": 34,
      "county": "Nairobi",
      "phoneNumber": "+254712345678"
    },
    "sourceHospital": {
      "id": 7,
      "name": "Kisumu County Hospital",
      "facilityLevel": "Level 4",
      "county": "Kisumu"
    },
    "destinationHospital": {
      "id": 14,
      "name": "Kenyatta National Hospital",
      "facilityLevel": "Level 6",
      "county": "Nairobi"
    },
    "createdByUser": {
      "id": 23,
      "fullName": "Dr. James Waweru",
      "role": "Clinician"
    },
    "timeline": [
      {
        "status": "Draft",
        "previousStatus": null,
        "actionBy": { "id": 23, "fullName": "Dr. James Waweru" },
        "notes": null,
        "timestamp": "2026-06-10T09:00:00.000Z"
      },
      {
        "status": "Dispatched",
        "previousStatus": "Draft",
        "actionBy": { "id": 31, "fullName": "Reception KCH" },
        "notes": null,
        "timestamp": "2026-06-10T09:15:00.000Z"
      }
    ],
    "createdAt": "2026-06-10T09:00:00.000Z",
    "updatedAt": "2026-06-10T09:22:00.000Z"
  },
  "message": "Referral retrieved",
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

> For Receptionist: `clinicalSummary` is replaced with `"[RESTRICTED - Clinician Access Only]"` and patient PII is masked.

**Error Responses**

| Code | error.code | Scenario |
|------|-----------|---------|
| `404` | `RESOURCE_NOT_FOUND` | Referral not found |
| `403` | `AUTH_INSUFFICIENT_PERMISSIONS` | Referral belongs to unrelated facility |

---

## PATCH `/referrals/:referralId/status`

Transition a referral to a new status. Role and current status determine what transitions are allowed.

**Auth required:** Clinician, Receptionist

**Request Body**
```json
{
  "status": "Accepted",
  "notes": "ICU bed assigned. Team on standby."
}
```

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `status` | string | ✅ | Target status |
| `notes` | string | ❌ | Optional context note |
| `rejectionReason` | string | Conditional | Required when status = `Rejected` (min 15 chars) |

**Allowed transitions by role:**

| Role | From → To | Notes |
|------|-----------|-------|
| Clinician / Receptionist | `Draft` → `Dispatched` | |
| Receptionist (destination) | `Dispatched` → `Received` | |
| Clinician (destination) | `Received` → `Accepted` | |
| Clinician (destination) | `Received` → `Rejected` | `rejectionReason` required |
| Clinician (destination) | `Accepted` → `Completed` | |
| Clinician (source) | `Rejected` → `Dispatched` | Resubmit after revision |

**Response 200 — Success**
```json
{
  "success": true,
  "data": {
    "id": 981,
    "referralCode": "REF-2026-00981",
    "previousStatus": "Received",
    "currentStatus": "Accepted",
    "updatedAt": "2026-06-10T10:07:00.000Z"
  },
  "message": "Referral status updated to Accepted",
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

**Error Responses**

| Code | error.code | Scenario |
|------|-----------|---------|
| `422` | `RESOURCE_INVALID_STATE_TRANSITION` | Transition not allowed from current status |
| `403` | `AUTH_INSUFFICIENT_PERMISSIONS` | Wrong role for this transition |
| `400` | `VALIDATION_ERROR` | rejectionReason missing |

---

---

# MODULE 6 — REFERRAL MESSAGES (CHAT)

> The chat system uses **WebSockets (Socket.IO)** for real-time delivery.
> This REST endpoint is for loading message history on screen mount.
> See WebSocket Events section below for real-time protocol.

---

## GET `/referrals/:referralId/messages`

Load chat message history for a referral.

**Auth required:** Clinician only (both source and destination)

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `page` | integer | ❌ | Default: 1 |
| `limit` | integer | ❌ | Default: 50 (messages load newest-first) |
| `before` | string | ❌ | ISO 8601 timestamp — load messages before this time |

**Response 200 — Success**
```json
{
  "success": true,
  "data": [
    {
      "id": 301,
      "referralId": 981,
      "sender": {
        "id": 50,
        "fullName": "Dr. Njoroge",
        "hospitalName": "Kenyatta National Hospital"
      },
      "content": "Is the patient currently on ACE inhibitors?",
      "isRead": true,
      "createdAt": "2026-06-10T10:02:00.000Z"
    },
    {
      "id": 302,
      "referralId": 981,
      "sender": {
        "id": 23,
        "fullName": "Dr. James Waweru",
        "hospitalName": "Kisumu County Hospital"
      },
      "content": "Yes, enalapril 5mg daily for the past 6 months.",
      "isRead": true,
      "createdAt": "2026-06-10T10:05:00.000Z"
    }
  ],
  "message": "Messages retrieved",
  "meta": { "timestamp": "...", "requestId": "...", "pagination": { } }
}
```

**Error Responses**

| Code | error.code | Scenario |
|------|-----------|---------|
| `403` | `AUTH_INSUFFICIENT_PERMISSIONS` | Receptionist attempting to access chat |
| `404` | `RESOURCE_NOT_FOUND` | Referral not found |

---

---

# MODULE 7 — NOTIFICATIONS

---

## GET `/notifications`

Get all notifications for the authenticated user.

**Auth required:** Any authenticated user

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `isRead` | boolean | ❌ | `true` or `false` — filter by read status |
| `page` | integer | ❌ | Default: 1 |
| `limit` | integer | ❌ | Default: 30 |

**Response 200 — Success**
```json
{
  "success": true,
  "data": [
    {
      "id": 501,
      "type": "REFERRAL_ACCEPTED",
      "title": "Referral Accepted",
      "body": "REF-2026-00981 was accepted by Kenyatta National Hospital.",
      "isRead": false,
      "data": {
        "referralId": 981,
        "referralCode": "REF-2026-00981"
      },
      "createdAt": "2026-06-10T10:07:00.000Z"
    },
    {
      "id": 500,
      "type": "MESSAGE_RECEIVED",
      "title": "New Message",
      "body": "Dr. Njoroge on REF-2026-00812: Is the patient on ACE inhibitors?",
      "isRead": false,
      "data": {
        "referralId": 812,
        "referralCode": "REF-2026-00812"
      },
      "createdAt": "2026-06-10T10:02:00.000Z"
    }
  ],
  "message": "Notifications retrieved",
  "meta": { "timestamp": "...", "requestId": "...", "pagination": { } }
}
```

---

## PATCH `/notifications/:notificationId/read`

Mark a single notification as read.

**Auth required:** Any authenticated user (own notifications only)

**Response 200 — Success**
```json
{
  "success": true,
  "data": { "id": 501, "isRead": true },
  "message": "Notification marked as read",
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

---

## PATCH `/notifications/read-all`

Mark all of the authenticated user's notifications as read.

**Auth required:** Any authenticated user

**Response 200 — Success**
```json
{
  "success": true,
  "data": { "updatedCount": 5 },
  "message": "All notifications marked as read",
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

---

---

# MODULE 8 — REPORTS

---

## GET `/reports/county`

Get referral analytics aggregated by county. Anonymized — no patient PII.

**Auth required:** System Admin, Hospital Admin

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `startDate` | string | ✅ | ISO 8601 date (`YYYY-MM-DD`) |
| `endDate` | string | ✅ | ISO 8601 date (`YYYY-MM-DD`) |
| `county` | string | ❌ | Filter to a specific county |

**Response 200 — Success**
```json
{
  "success": true,
  "data": [
    {
      "county": "Nairobi",
      "totalReferrals": 412,
      "accepted": 287,
      "rejected": 45,
      "completed": 260,
      "pending": 80,
      "averageResponseTimeHours": 3.8
    },
    {
      "county": "Kisumu",
      "totalReferrals": 198,
      "accepted": 140,
      "rejected": 22,
      "completed": 130,
      "pending": 36,
      "averageResponseTimeHours": 5.2
    }
  ],
  "message": "County analytics retrieved",
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

---

## GET `/reports/referral-trends`

Get referral volume trends over time (daily or weekly).

**Auth required:** System Admin, Hospital Admin

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `startDate` | string | ✅ | ISO 8601 date |
| `endDate` | string | ✅ | ISO 8601 date |
| `groupBy` | string | ❌ | `day` or `week` — default: `day` |

**Response 200 — Success**
```json
{
  "success": true,
  "data": [
    { "period": "2026-06-01", "total": 45, "urgent": 12, "emergent": 3, "routine": 30 },
    { "period": "2026-06-02", "total": 52, "urgent": 15, "emergent": 5, "routine": 32 },
    { "period": "2026-06-03", "total": 38, "urgent": 10, "emergent": 2, "routine": 26 }
  ],
  "message": "Referral trends retrieved",
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

---

## GET `/reports/facility-performance`

Get performance metrics per facility. System Admin sees all; Hospital Admin sees own.

**Auth required:** System Admin, Hospital Admin

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `startDate` | string | ✅ | ISO 8601 date |
| `endDate` | string | ✅ | ISO 8601 date |
| `hospitalId` | integer | ❌ | System Admin only — filter to a specific hospital |

**Response 200 — Success**
```json
{
  "success": true,
  "data": [
    {
      "hospitalId": 7,
      "hospitalName": "Kisumu County Hospital",
      "facilityLevel": "Level 4",
      "county": "Kisumu",
      "referralsSent": 89,
      "referralsReceived": 34,
      "acceptanceRate": 82.4,
      "rejectionRate": 17.6,
      "averageResponseTimeHours": 4.2,
      "completionRate": 76.1
    }
  ],
  "message": "Facility performance retrieved",
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

---

---

# MODULE 9 — AUDIT LOGS

---

## GET `/audit-logs`

Retrieve the immutable system audit log. System Admin only.

**Auth required:** System Admin

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | integer | ❌ | Filter by user |
| `actionType` | string | ❌ | e.g. `USER_LOGIN`, `VIEW_PATIENT_PII` |
| `startDate` | string | ❌ | ISO 8601 datetime |
| `endDate` | string | ❌ | ISO 8601 datetime |
| `ip` | string | ❌ | Filter by IP address |
| `page` | integer | ❌ | Default: 1 |
| `limit` | integer | ❌ | Default: 50, max: 200 |

**Response 200 — Success**
```json
{
  "success": true,
  "data": [
    {
      "id": 10042,
      "user": {
        "id": 23,
        "username": "dr.waweru",
        "role": "Clinician"
      },
      "actionType": "VIEW_PATIENT_PII",
      "ipAddress": "105.163.0.12",
      "userAgent": "Mozilla/5.0 (Linux; Android 13) ...",
      "resourceAffected": "/api/v1/patients/4501",
      "payloadSnapshot": "{\"patientId\":4501,\"action\":\"GET\"}",
      "timestamp": "2026-06-10T10:00:00.000Z"
    }
  ],
  "message": "Audit logs retrieved",
  "meta": { "timestamp": "...", "requestId": "...", "pagination": { } }
}
```

---

---

# MODULE 10 — OFFLINE SYNC (MOBILE ONLY)

---

## POST `/sync`

Mobile-only endpoint. Returns all data that has changed since the device's last sync timestamp. Used by WatermelonDB sync engine.

**Auth required:** Clinician, Receptionist

**Request Body**
```json
{
  "lastSyncedAt": "2026-06-10T08:00:00.000Z",
  "deviceId": "550e8400-e29b-41d4-a716-446655440001"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `lastSyncedAt` | string | ✅ | ISO 8601 timestamp of last successful sync |
| `deviceId` | string | ✅ | Unique device identifier |

**Response 200 — Success**
```json
{
  "success": true,
  "data": {
    "referrals": [
      {
        "id": 981,
        "referralCode": "REF-2026-00981",
        "status": "Accepted",
        "updatedAt": "2026-06-10T10:07:00.000Z"
      }
    ],
    "patients": [],
    "notifications": [
      {
        "id": 501,
        "type": "REFERRAL_ACCEPTED",
        "body": "REF-2026-00981 accepted by KNH",
        "isRead": false,
        "createdAt": "2026-06-10T10:07:00.000Z"
      }
    ],
    "serverTime": "2026-06-10T10:30:00.000Z"
  },
  "message": "Sync data retrieved",
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

> **serverTime** — store this as `lastSyncedAt` for the next sync call.
> Arrays will be empty `[]` if nothing changed for that entity.

---

---

# WEBSOCKET EVENTS — REAL-TIME CHAT & NOTIFICATIONS

**Namespace:** `/chat`
**Connection URL:** `wss://api.prms.health.go.ke/chat`

**Handshake Auth**
```javascript
const socket = io('wss://api.prms.health.go.ke/chat', {
  auth: { token: accessToken },
  transports: ['websocket']
});
```

---

## Client → Server Events

### `JOIN_REFERRAL_ROOM`
Join the chat channel for a specific referral. Must be called before sending messages.

```json
{ "referralId": 981 }
```

---

### `SEND_MESSAGE`
Send a message on a referral chat channel.

```json
{
  "referralId": 981,
  "content": "Is the patient on ACE inhibitors?"
}
```

---

### `TYPING_START`
Notify other participants the user has started typing.

```json
{ "referralId": 981 }
```

---

### `TYPING_STOP`
Notify other participants the user stopped typing.

```json
{ "referralId": 981 }
```

---

### `MARK_MESSAGES_READ`
Mark all messages in a referral as read by this user.

```json
{ "referralId": 981 }
```

---

## Server → Client Events

### `NEW_MESSAGE`
Fired when a new message arrives in a referral room you have joined.

```json
{
  "id": 303,
  "referralId": 981,
  "sender": {
    "id": 23,
    "fullName": "Dr. James Waweru",
    "hospitalName": "Kisumu County Hospital"
  },
  "content": "Yes, enalapril 5mg daily.",
  "createdAt": "2026-06-10T10:05:00.000Z"
}
```

---

### `MESSAGE_DELIVERED`
Fired when a message you sent was delivered to the server.

```json
{ "messageId": 303, "referralId": 981 }
```

---

### `MESSAGE_READ`
Fired when the other participant reads your message.

```json
{
  "messageId": 303,
  "referralId": 981,
  "readBy": { "id": 50, "fullName": "Dr. Njoroge" },
  "readAt": "2026-06-10T10:06:00.000Z"
}
```

---

### `USER_TYPING`
Fired when the other participant starts typing.

```json
{
  "referralId": 981,
  "user": { "id": 50, "fullName": "Dr. Njoroge" }
}
```

---

### `USER_STOPPED_TYPING`
Fired when the other participant stops typing.

```json
{
  "referralId": 981,
  "user": { "id": 50, "fullName": "Dr. Njoroge" }
}
```

---

### `REFERRAL_STATUS_CHANGED`
Fired when the referral status updates while the user has the room open.

```json
{
  "referralId": 981,
  "referralCode": "REF-2026-00981",
  "previousStatus": "Received",
  "newStatus": "Accepted",
  "changedBy": { "id": 50, "fullName": "Dr. Njoroge" },
  "timestamp": "2026-06-10T10:07:00.000Z"
}
```

---

### `ERROR`
Fired on any socket-level error.

```json
{
  "code": "AUTH_TOKEN_EXPIRED",
  "message": "Your session has expired. Please log in again."
}
```

---

---

# QUICK REFERENCE — ALL ENDPOINTS

| Method | Endpoint | Auth | Who |
|--------|----------|------|-----|
| POST | `/auth/login` | Public | All |
| POST | `/auth/verify-2fa` | Pre-auth token | All |
| POST | `/auth/refresh` | Refresh token | All |
| POST | `/auth/logout` | Authenticated | All |
| POST | `/auth/forgot-password` | Public | All |
| POST | `/auth/reset-password` | Reset token | All |
| GET | `/auth/me` | Authenticated | All |
| PATCH | `/auth/change-password` | Authenticated | All |
| POST | `/auth/register-device` | Authenticated | Mobile |
| POST | `/hospitals` | Public | All |
| GET | `/hospitals` | System Admin | Web |
| GET | `/hospitals/:hospitalId` | System Admin, Hospital Admin | Web |
| PATCH | `/hospitals/:hospitalId/status` | System Admin | Web |
| GET | `/users` | Hospital Admin | Web |
| POST | `/users` | Hospital Admin | Web |
| GET | `/users/:userId` | Hospital Admin | Web |
| PATCH | `/users/:userId` | Hospital Admin | Web |
| PATCH | `/users/:userId/status` | Hospital Admin | Web |
| POST | `/patients` | Clinician, Receptionist | Mobile |
| GET | `/patients` | Clinician, Receptionist | Mobile |
| GET | `/patients/:patientId` | Clinician, Receptionist | Mobile |
| POST | `/referrals` | Clinician | Mobile |
| GET | `/referrals` | Clinician, Receptionist | Mobile |
| GET | `/referrals/:referralId` | Clinician, Receptionist | Mobile |
| PATCH | `/referrals/:referralId/status` | Clinician, Receptionist | Mobile |
| GET | `/referrals/:referralId/messages` | Clinician | Mobile |
| GET | `/notifications` | Authenticated | Mobile, Web |
| PATCH | `/notifications/:notificationId/read` | Authenticated | Mobile, Web |
| PATCH | `/notifications/read-all` | Authenticated | Mobile, Web |
| GET | `/reports/county` | System Admin, Hospital Admin | Web |
| GET | `/reports/referral-trends` | System Admin, Hospital Admin | Web |
| GET | `/reports/facility-performance` | System Admin, Hospital Admin | Web |
| GET | `/audit-logs` | System Admin | Web |
| POST | `/sync` | Clinician, Receptionist | Mobile only |

---

*End of PRMS API Reference v1.0*
*Feed this document to: Web Admin Team, Mobile Team, Integration Team*
