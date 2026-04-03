import { NextResponse } from "next/server";
import {
  getAllowedOrigins,
  getRequestOrigin,
} from "@/lib/requestSecurity";

interface CorsOptions {
  allowCredentials?: boolean;
  methods: string[];
}

export function applyCorsHeaders(
  request: Request,
  response: NextResponse,
  options: CorsOptions,
) {
  const requestOrigin = getRequestOrigin(request);
  if (!requestOrigin) {
    return response;
  }

  if (!isCorsOriginAllowed(request)) {
    return response;
  }

  response.headers.set("Access-Control-Allow-Origin", requestOrigin);
  response.headers.set("Access-Control-Allow-Methods", options.methods.join(", "));
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With",
  );
  response.headers.set("Vary", "Origin");

  if (options.allowCredentials) {
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  return response;
}

export function isCorsOriginAllowed(request: Request): boolean {
  const requestOrigin = getRequestOrigin(request);
  if (!requestOrigin) {
    return false;
  }

  return getAllowedOrigins(request).includes(requestOrigin);
}

export function forbiddenCorsResponse() {
  return new NextResponse(JSON.stringify({ error: "Forbidden" }), {
    status: 403,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export function handleCorsPreflight(
  request: Request,
  options: CorsOptions,
): NextResponse | null {
  if (request.method !== "OPTIONS") {
    return null;
  }

  const requestOrigin = getRequestOrigin(request);
  if (!requestOrigin || !isCorsOriginAllowed(request)) {
    return forbiddenCorsResponse();
  }

  const response = new NextResponse(null, { status: 204 });
  return applyCorsHeaders(request, response, options);
}
