# CleanMail 2 Handover - Category Colors & Advanced UI

## 🎯 Task Objective
Implement Microsoft Outlook category (tag) color synchronization and high-performance Folder/Color selection UI.

## 🛠 Features Implemented
1.  **Outlook Master Category Sync**: 
    - Categories created/updated in CleanMail are automatically synced to Microsoft Graph's `masterCategories`.
    - Supports 25 Outlook color presets (`preset0` to `preset24`).
2.  **Smart Color Picker**:
    - Searchable dropdown with custom slim scrollbar.
    - Standard Outlook category labels.
3.  **Advanced Folder Selector**:
    - Searchable folder list.
    - **In-place Subfolder Creation**: Direct `+` button in the list to create nested folders (e.g., `Parent/NewSub`) via Graph API.
4.  **Outlook-styled Badges**:
    - `TagBadge` component mimics Outlook's visual style with tag icons and color coding.

## 📂 Key Files & Architecture

### 1. Core Logic
- `src/lib/colors.ts`: Centralized color preset definitions (BGs, text colors, icons, and Outlook labels).
- `src/infra/graph-client.ts`: 
    - `ensureMasterCategories()`: Deduplicates and ensures colors are synced to Outlook before any tagging action.
    - `createCategory()` / `updateCategory()`: Direct Graph API calls.
- `src/actions/organize.ts`:
    - Logic for consolidating rule colors and manual override colors before execution.
    - **Priority**: Manual override colors (from Run dialog) always take precedence over Rule-stored colors.

### 2. UI Components (src/components/common/)
- `ColorPicker.tsx`: Uses `cmdk` for fast search and fixed-height scroll container.
- `FolderSelector.tsx`: Handles folder search + subfolder creation UI.
- `TagBadge.tsx`: Displays name + icon with Outlook preset colors.

## ⚠️ Notes for Future Agents
- **Deduplication**: When running multiple rules or manual tags, always use a `Map` in `organize.ts` to ensure each category only gets one `ensureMasterCategories` call with the correct priority color.
- **Scrollbars**: Custom scrollbar styles are defined in `src/app/globals.css` under `.custom-scrollbar`.
- **Microsoft Graph Quotas**: `ensureMasterCategories` fetches all categories first to avoid unnecessary POST/PATCH calls.

---
*Created by Antigravity (Advanced Agentic Coding) - 2026-02-28*
