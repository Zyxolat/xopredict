# XoPredict — Authentication Flow Documentation

## 1. Registration & Email Verification
```
[Visitor] -> Submit Email, Username, Password -> POST /api/auth/register
                                                     |
                                         (Generate 6-digit OTP)
                                                     |
                                           (Send Email via Resend)
                                                     |
[User Receives Email] -> Enter OTP -> POST /api/auth/verify-email -> [Account Activated]
```

## 2. Login & Session Issuance
```
[User] -> Enter Email & Password -> signIn("credentials")
                                         |
                            (Validate bcrypt hash)
                                         |
                            (Check emailVerified)
                                         |
                        [Issue JWT Session Token]
```

## 3. Post-Auth Wallet Linking
```
[Authenticated User] -> Click "Link Wallet" -> Connect MetaMask/Wagmi
                                                   |
                                     GET /api/auth/wallet (Get Nonce)
                                                   |
                                 Sign Message ("Sign this message...")
                                                   |
                                 POST /api/auth/wallet (Verify Signature)
                                                   |
                                       [Wallet Linked to User]
```

## 4. Password Recovery
```
[User] -> Enter Email -> POST /api/auth/forgot-password
                              |
                   (Send OTP via Resend)
                              |
[User] -> Enter OTP + New Password -> POST /api/auth/reset-password
                              |
                   (Update Hash & Invalidate Sessions)
```
