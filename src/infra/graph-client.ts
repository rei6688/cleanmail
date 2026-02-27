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
  displayName: string
): Promise<GraphFolder> {
  return graphFetch<GraphFolder>(`${GRAPH_BASE}/mailFolders`, accessToken, {
    method: "POST",
    body: JSON.stringify({ displayName }),
  });
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
  if (options.filter) params.set("$filter", options.filter);
  if (options.skip) params.set("$skip", String(options.skip));

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

// ── Get Folder by Name ────────────────────────────────────────────────────────

export async function getFolderIdByName(
  accessToken: string,
  displayName: string
): Promise<string | null> {
  const folders = await listMailFolders(accessToken);
  const match = folders.find(
    (f) => f.displayName.toLowerCase() === displayName.toLowerCase()
  );
  return match?.id ?? null;
}
