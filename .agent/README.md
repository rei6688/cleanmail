# 🤖 Agent Onboarding & Documentation

Welcome to the **CleanMail 2** Agent workspace. This directory contains instructions, workflows, and documentation designed to help AI agents understand the codebase and maintain consistency.

## 📂 Directory Structure

- `workflows/`: Step-by-step guides for common tasks (e.g., deployments, testing).
- `handover-category-colors.md`: Detailed documentation for the Outlook Category Sync & UI upgrade (Feb 2026).

## 🚀 Key Modules for Agents

### 1. Outlook Category Sync (`src/infra/graph-client.ts`)
- **Action**: Always call `ensureMasterCategories()` before tagging.
- **Why**: Outlook requires categories to exist in the "Master Category List" to display colors correctly.
- **Reference**: See `handover-category-colors.md` for color preset mapping.

### 2. Rule Engine (`src/domain/rule-engine.ts`)
- Handles the core logic for matching conditions (senders, keywords) and computing category changes.

### 3. Execution Flow (`src/actions/organize.ts`)
- The bridge between the UI and the Domain/Infra layers.
- Handles OAuth token refreshing and rule resolution.

## 🛠 Guidelines
- **UI Logic**: Always use the atomic components in `src/components/common/` (`ColorPicker`, `FolderSelector`, `TagBadge`) for consistency.
- **State Management**: Use Server Actions for mutations and React Server Components (RSC) for data fetching where possible.
- **Error Handling**: Follow the `{ success: boolean, data?: any, error?: string }` pattern for all Server Actions.

---
*Maintained by the Agentic Coding Team*
