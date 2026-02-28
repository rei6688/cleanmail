---
description: How to test the CleanMail 2 application
---

## 🧪 Testing Workflow

1.  **Static Checking**:
    - Run `pnpm tsc --noEmit` to check for TypeScript errors.
    - Run `pnpm lint` to check for ESLint issues.

2.  **Unit Tests**:
    - Use `pnpm test` to run Jest unit tests (found in `__tests__/`).
    - Focus on `src/domain/rule-engine.ts` for logic changes.

3.  **Manual Verification**:
    - **Staging Mode**: Use the "Test Match" (Bug icon) in the UI to verify moving/tagging matches to `99_Staging_Review`.
    - **UI Verification**: Ensure `ColorPicker` and `FolderSelector` work with Search + Scroll correctly.
    - **Outlook Sync**: Verify that colors applied in the UI appear correctly as "Master Categories" in the Outlook Web/Desktop client.

4.  **Before Commit**:
    - Always verify that the project builds correctly with `pnpm build`.
