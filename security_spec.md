# MATHMIND AI — Firestore Security Specification (Phase 0)

## 1. Data Invariants
1. **Role Integrity**: Regular users cannot self-assign `teacher`, `school_admin`, or `super_admin` roles on creation or profile update; only the verified bootstrapped admin (`pd.emu2028@gmail.com`) or an existing admin can elevate roles.
2. **PII Isolation**: User email and guardian contact are isolated in `/users/{userId}/private/{docId}`, readable and writable only by the owner or verified Super Admin.
3. **Student Data Isolation**: Assessments, remedial plans, quiz attempts, Olympiad attempts, and tutor sessions belong strictly to `userId == request.auth.uid` (or explicitly linked parent `parentUid` / assigned teacher `assignedTeacherId` / admin).
4. **Master Gate on Class Enrollments**: Access to `/classes/{classId}/enrollments/{studentId}` requires fetching the parent `/classes/{classId}` document via `get()` to verify `teacherId == request.auth.uid` or `isAdmin()`.
5. **Immutable Audit Trail**: `/auditLogs/{logId}` is append-only (`allow update, delete: if false;`) and readable only by admins.
6. **Temporal Integrity & Immortal Fields**: `createdAt` and `userId`/`ownerId` cannot change on update, and `createdAt`/`updatedAt` must equal `request.time`.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Unverified Email Write**: Authenticated user with `email_verified: false` tries to create `/studentProfiles/{uid}`.
2. **Self-Role Escalation (Create)**: Non-admin user tries to create `/users/{uid}` with `role: "super_admin"`.
3. **Self-Role Escalation (Update)**: Non-admin student tries to update `/users/{uid}` changing `role` from `"student"` to `"teacher"`.
4. **Shadow Field Injection**: Student creates `/assessments/a1` including an undeclared ghost field `isVerifiedByAdmin: true`.
5. **Identity Spoofing**: Student A tries to create `/assessments/a2` with `userId: "studentB"`.
6. **Cross-Student PII Read**: Student A tries to `get` `/users/studentB/private/info`.
7. **Unauthorized List Scraping**: Non-admin user executes an unbounded `list` on `/assessments` without matching `resource.data.userId == request.auth.uid`.
8. **ID Poisoning**: User tries to create `/quizAttempts/` with a 200-character malformed ID containing `$` and `/`.
9. **Array Exhaustion**: User tries to write `/assessments/a3` with `responses` array of 200 items (exceeding `<= 100` bound).
10. **Terminal State Tampering**: Student tries to update a `completed` assessment's `overallScore` or `status` back to `in_progress`.
11. **Timestamp Forgery**: User submits `createdAt` as a string or past timestamp instead of `request.time`.
12. **Audit Log Tampering**: User tries to `update` or `delete` an entry in `/auditLogs/{logId}`.
