/** Minimal Netlify Functions v1 event shape used by muffin handlers. */
export interface NetlifyEvent {
  httpMethod: string;
  headers?: Record<string, string | undefined>;
  body?: string | null;
  queryStringParameters?: Record<string, string | undefined> | null;
  blobs?: string;
}

export interface NetlifyResponse {
  statusCode: number;
  headers?: Record<string, string>;
  multiValueHeaders?: Record<string, string[]>;
  body: string;
}

export type NetlifyHandler = (
  event: NetlifyEvent
) => Promise<NetlifyResponse> | NetlifyResponse;
