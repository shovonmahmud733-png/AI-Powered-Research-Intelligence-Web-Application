# Security Policy: Research Intelligence Platform

## Security Controls

1. **Authentication & Password Hashing**: Passwords hashed using bcrypt with work factor 10. Sessions managed via signed JWT tokens in HTTP-only cookies.
2. **User Data Isolation**: Queries filter by `userId` or authenticated project boundaries to prevent cross-account access.
3. **File Upload Security**:
   * Restricted to `application/pdf`.
   * Enforces 25MB maximum file size limit.
   * Scans document headers before parsing text layers.
4. **Secret Protection**: All API keys (`OPENAI_API_KEY`, `JWT_SECRET`) reside strictly in server-side environment variables and are never exposed to browser bundles.
5. **Sanitization**: Draft text and paper abstracts are sanitized before rendering.

## Reporting Vulnerabilities
Report any vulnerability disclosures to `security@university.edu`.
