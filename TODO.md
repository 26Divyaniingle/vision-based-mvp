# OTP Email Delivery Fix - Using SMTP/Gmail

## Steps:
- [x] Reverted to SMTP (email_service.py)
- [ ] Add SMTP creds to .env
- [ ] Test OTP endpoint

**Setup Gmail:**
1. Enable 2FA on Gmail
2. https://myaccount.google.com/apppasswords → Generate "Mail" app password (16 chars)
3. .env:
```
SMTP_USER=your@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
```
4. Restart server
5. POST /auth/recovery/forgot-token {"email": "your@gmail.com"}

Console shows "✅ OTP sent" → check inbox!



