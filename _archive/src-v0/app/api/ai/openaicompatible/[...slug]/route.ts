import { NextResponse, type NextRequest } from "next/server";
import { completePath } from "@/utils/url";

export const runtime = "edge";
export const preferredRegion = [
  "cle1",
  "iad1",
  "pdx1",
  "sfo1",
  "sin1",
  "syd1",
  "hnd1",
  "kix1",
];

const API_PROXY_BASE_URL = completePath(
  process.env.OPENAI_COMPATIBLE_API_BASE_URL || "",
  "/v1"
);

async function handler(req: NextRequest) {
  console.log(`[openaicompatible] HANDLER HIT: ${req.method} ${req.nextUrl.pathname}`);
  let body;
  if (req.method.toUpperCase() !== "GET") {
    body = await req.json();
  }
  const searchParams = req.nextUrl.searchParams;
  const slug = searchParams.getAll("slug");
  searchParams.delete("slug");
  const params = searchParams.toString();

  // The client proxy URL includes /v1, but the base URL may already have a
  // version path (e.g. /v4). Strip the leading version segment from slug so
  // we don't double-up: base/v4 + slug[v1,...] -> base/v4/v1/... (wrong)
  // becomes base/v4 + slug[...] -> base/v4/... (correct).
  const path =
    slug.length > 0 && /^v\d+$/.test(slug[0]) ? slug.slice(1) : slug;

  try {
    let url = `${API_PROXY_BASE_URL}/${decodeURIComponent(path.join("/"))}`;
    if (params) url += `?${params}`;
    const payload: RequestInit = {
      method: req.method,
      headers: {
        "Content-Type": req.headers.get("Content-Type") || "application/json",
        Authorization: req.headers.get("Authorization") || "",
      },
    };
    if (body) payload.body = JSON.stringify(body);
    console.log(`[openaicompatible] ${req.method} slug=${JSON.stringify(slug)} path=${JSON.stringify(path)} -> ${url}`);
    const response = await fetch(url, payload);
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[openaicompatible] ${response.status} from ${url}: ${errorBody}`);
      return NextResponse.json(
        { code: response.status, message: errorBody },
        { status: response.status }
      );
    }
    return new NextResponse(response.body, response);
  } catch (error) {
    if (error instanceof Error) {
      console.error(error);
      return NextResponse.json(
        { code: 500, message: error.message },
        { status: 500 }
      );
    }
  }
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
