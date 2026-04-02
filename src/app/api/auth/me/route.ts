import { validateSession, getTokenFromRequest } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/apiUtils";

export async function GET(request: Request) {
  try {
    const token = getTokenFromRequest(request);

    if (!token) {
      return jsonOk({ authenticated: false, user: null });
    }

    const session = await validateSession(token);

    if (!session) {
      const response = jsonOk({ authenticated: false, user: null });
      response.cookies.set("auth-token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
      });

      return response;
    }

    return jsonOk({
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        avatarUrl: session.user.avatarUrl,
      },
    });
  } catch (error) {
    console.error("Me error:", error);
    return jsonError("เกิดข้อผิดพลาด", 500, {
      authenticated: false,
      user: null,
    });
  }
}
