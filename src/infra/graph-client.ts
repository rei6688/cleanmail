import type { GraphMessage, GraphFolder } from "@/types";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0/me";

function authHeader(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

async function graphFetch<T>(
  url: string,
  accessToken: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...authHeader(accessToken),
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Graph API error ${res.status}: ${body}`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ── Mail Folders ──────────────────────────────────────────────────────────────

export async function listMailFolders(
  accessToken: string
): Promise<GraphFolder[]> {
  const data = await graphFetch<{ value: GraphFolder[] }>(
    `${GRAPH_BASE}/mailFolders?$top=250`,
    accessToken
  );
  return data.value;
}

export async function createMailFolder(
  accessToken: string,
  displayName: string,
  parentFolderId?: string
): Promise<GraphFolder> {
  const url = parentFolderId
    ? `${GRAPH_BASE}/mailFolders/${parentFolderId}/childFolders`
    : `${GRAPH_BASE}/mailFolders`;
  return graphFetch<GraphFolder>(url, accessToken, {
    method: "POST",
    body: JSON.stringify({ displayName }),
  });
}

export async function deleteMailFolder(
  accessToken: string,
  folderId: string
): Promise<void> {
  await graphFetch<void>(`${GRAPH_BASE}/mailFolders/${folderId}`, accessToken, {
    method: "DELETE",
  });
}

export async function listChildFolders(
  accessToken: string,
  parentFolderId: string
): Promise<GraphFolder[]> {
  const data = await graphFetch<{ value: GraphFolder[] }>(
    `${GRAPH_BASE}/mailFolders/${parentFolderId}/childFolders?$top=250`,
    accessToken
  );
  return data.value;
}

// ── Messages ─────────────────────────────────────────────────────────────────

export interface ListMessagesOptions {
  folder?: string; // folder id or well-known name
  filter?: string; // OData filter
  top?: number;
  skip?: number;
}

export async function listMessages(
  accessToken: string,
  options: ListMessagesOptions = {}
): Promise<{ value: GraphMessage[]; nextLink?: string }> {
  const folder = options.folder ?? "inbox";
  const top = options.top ?? 50;
  const params = new URLSearchParams({
    $top: String(top),
    $select:
      "id,subject,from,isRead,categories,parentFolderId,receivedDateTime,bodyPreview,body",
    $orderby: "receivedDateTime desc",
  });
  if (options.filter) {
    params.set("$filter", options.filter);
  }

  const data = await graphFetch<{
    value: GraphMessage[];
    "@odata.nextLink"?: string;
  }>(
    `${GRAPH_BASE}/mailFolders/${folder}/messages?${params.toString()}`,
    accessToken
  );
  return { value: data.value, nextLink: data["@odata.nextLink"] };
}

// ── Move Message ──────────────────────────────────────────────────────────────

export async function moveMessage(
  accessToken: string,
  messageId: string,
  destinationFolderId: string
): Promise<GraphMessage> {
  return graphFetch<GraphMessage>(
    `${GRAPH_BASE}/messages/${messageId}/move`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({ destinationId: destinationFolderId }),
    }
  );
}

export async function deleteMessage(
  accessToken: string,
  messageId: string
): Promise<void> {
  await graphFetch<void>(`${GRAPH_BASE}/messages/${messageId}`, accessToken, {
    method: "DELETE",
  });
}

// ── Update Categories ─────────────────────────────────────────────────────────

export async function updateMessageCategories(
  accessToken: string,
  messageId: string,
  categories: string[]
): Promise<void> {
  await graphFetch<void>(
    `${GRAPH_BASE}/messages/${messageId}`,
    accessToken,
    {
      method: "PATCH",
      body: JSON.stringify({ categories }),
    }
  );
}

// ── Rules ──────────────────────────────────────────────────────────────────
export async function listOutlookRules(accessToken: string): Promise<any[]> {
  const data = await graphFetch<{ value: any[] }>(
    `${GRAPH_BASE}/mailFolders/inbox/messageRules`,
    accessToken
  );
  return data.value;
}

export async function deleteOutlookRule(
  accessToken: string,
  ruleId: string
): Promise<void> {
  await graphFetch<void>(
    `${GRAPH_BASE}/mailFolders/inbox/messageRules/${ruleId}`,
    accessToken,
    { method: "DELETE" }
  );
}

// ── Categories ─────────────────────────────────────────────────────────────
export async function listCategories(accessToken: string): Promise<any[]> {
  const data = await graphFetch<{ value: any[] }>(
    `${GRAPH_BASE}/outlook/masterCategories`,
    accessToken
  );
  return data.value;
}

export async function deleteCategory(
  accessToken: string,
  categoryId: string
): Promise<void> {
  await graphFetch<void>(
    `${GRAPH_BASE}/outlook/masterCategories/${categoryId}`,
    accessToken,
    { method: "DELETE" }
  );
}

export async function createCategory(
  accessToken: string,
  displayName: string,
  color: string
): Promise<any> {
  const data = await graphFetch<any>(
    `${GRAPH_BASE}/outlook/masterCategories`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({ displayName, color }),
    }
  );
  return data;
}

export async function updateCategory(
  accessToken: string,
  categoryId: string,
  color: string
): Promise<any> {
  const data = await graphFetch<any>(
    `${GRAPH_BASE}/outlook/masterCategories/${categoryId}`,
    accessToken,
    {
      method: "PATCH",
      body: JSON.stringify({ color }),
    }
  );
  return data;
}

export async function ensureMasterCategories(
  accessToken: string,
  categories: { displayName: string, color?: string }[]
): Promise<void> {
  if (!categories.length) return;
  console.log(`[Graph] Ensuring ${categories.length} master categories...`);
  try {
    const existing = await listCategories(accessToken);
    for (const requested of categories) {
      if (!requested.displayName.trim()) continue;
      const reqName = requested.displayName.trim();
      const reqNameLower = reqName.toLowerCase();

      const match = existing.find((c: any) => c.displayName.toLowerCase() === reqNameLower);

      if (!match) {
        console.log(`[Graph] Creating new category "${reqName}" with color ${requested.color || "preset0"}`);
        await createCategory(accessToken, reqName, requested.color || "preset0");
      } else if (requested.color && match.color !== requested.color) {
        console.log(`[Graph] Updating category "${match.displayName}" (id: ${match.id}) from color ${match.color} to ${requested.color}`);
        await updateCategory(accessToken, match.id, requested.color);
      } else {
        console.log(`[Graph] Category "${match.displayName}" already exists with color ${match.color} (requested: ${requested.color || "none"})`);
      }
    }
  } catch (err) {
    console.error("[Graph] Failed to ensure master categories:", err);
  }
}

export async function ensureFolderByPath(
  accessToken: string,
  path: string
): Promise<string> {
  const parts = path.split("/").filter(Boolean);
  let currentParentId: string | undefined = undefined;

  for (const part of parts) {
    const folders: GraphFolder[] = currentParentId
      ? await listChildFolders(accessToken, currentParentId)
      : await listMailFolders(accessToken);

    let folder: GraphFolder | undefined = folders.find((f: GraphFolder) => f.displayName.toLowerCase() === part.toLowerCase());

    if (!folder) {
      // Create it if it doesn't exist
      folder = await createMailFolder(accessToken, part, currentParentId);
    }
    currentParentId = folder.id;
  }

  if (!currentParentId) throw new Error("Could not resolve folder path");
  return currentParentId;
}

/** @deprecated Use ensureFolderByPath */
export async function getFolderIdByName(
  accessToken: string,
  displayName: string
): Promise<string | null> {
  try {
    return await ensureFolderByPath(accessToken, displayName);
  } catch (e) {
    return null;
  }
}
