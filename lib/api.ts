/**
 * EventNest API client
 *
 * Key design decisions
 * ────────────────────
 * • All requests go through one `request()` function so headers,
 *   credentials, timeout, and error normalisation are applied once.
 * • express-validator returns { msg, path, … } — NOT { message, field }.
 *   ValidationDetail reflects the actual wire shape.
 * • A 10-second AbortController timeout prevents requests from hanging
 *   silently when the backend is unreachable.
 * • Network errors (CORS block, refused connection, DNS failure) are all
 *   caught and surfaced as a human-readable string.
 */

// ─── Runtime sanity-check of the env var ─────────────────────────────────────
const rawBase = process.env.NEXT_PUBLIC_API_URL;
if (!rawBase && typeof window !== "undefined") {
  console.warn(
    "[api] NEXT_PUBLIC_API_URL is not set. " +
    "Falling back to http://localhost:5000/api. " +
    "Add it to .env.local and restart the dev server."
  );
}

const _configured = (rawBase ?? "http://localhost:5000/api").trim();

/**
 * When NEXT_PUBLIC_API_URL is relative (e.g. "/api") — which is the case when
 * Next.js rewrites proxy the API — we need an absolute URL for server-side
 * fetch (Node has no implicit base URL).  Client-side fetch is fine with "/api".
 *
 * Resolution order:
 *   browser  → use the relative path as-is  ("/api")
 *   SSR/Node → prepend http://localhost:3000 so fetch gets a full URL
 */
export const API_BASE =
  _configured.startsWith("/")
    ? typeof window === "undefined"
      ? `http://localhost:${process.env.PORT ?? 3000}${_configured}`
      : _configured
    : _configured;

const REQUEST_TIMEOUT_MS = 10_000;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: "attendee" | "organizer" | "staff" | "admin";
  avatar: string | null;
  bio: string;
  isVerified: boolean;
  organizerProfile?: {
    companyName: string;
    website: string;
    verified: boolean;
    totalEventsHosted: number;
  };
  createdAt: string;
}

export interface ApiEvent {
  _id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  tags: string[];
  organizer: { _id: string; name: string; avatar: string | null } | string;
  startDate: string;
  endDate: string;
  timezone: string;
  venue: { name: string; address: string; city: string; country: string; state?: string };
  isOnline: boolean;
  onlineLink?: string;
  coverImage: string;
  status: "draft" | "published" | "cancelled" | "completed";
  isFeatured: boolean;
  totalCapacity: number;
  totalSold: number;
  refundPolicy: string;
  ticketTiers: TicketTier[];
  createdAt: string;
}

export interface TicketTier {
  _id?: string;
  name: string;
  type: "general" | "vip" | "early-bird" | "student" | "group";
  description?: string;
  price: number;
  quantity: number;
  sold?: number;
  maxPerOrder?: number;
  minPerOrder?: number;
  saleStartsAt?: string;
  saleEndsAt?: string;
  isVisible?: boolean;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
  hasNext: boolean;
}

/**
 * Matches the actual shape express-validator puts in the JSON body:
 * { msg, path, type, location, value? }
 */
export interface ValidationDetail {
  msg: string;       // ← express-validator uses "msg", not "message"
  path: string;      // ← express-validator uses "path", not "field"
  type?: string;
  location?: string;
  value?: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: ValidationDetail[];
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
): Promise<ApiResponse<T>> {
  let activeToken = token;
  if (typeof window !== "undefined") {
    const storedToken = localStorage.getItem("eb_token");
    if (storedToken) {
      activeToken = storedToken;
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (activeToken) {
    headers["Authorization"] = `Bearer ${activeToken}`;
  }

  // Abort after REQUEST_TIMEOUT_MS so the UI never hangs forever
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const url = `${API_BASE}${endpoint}`;

  if (process.env.NODE_ENV === "development") {
    console.debug(`[api] ${options.method ?? "GET"} ${url}`);
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      credentials: "include",   // send httpOnly refresh-token cookie to :5000
      signal: controller.signal,
    });

    clearTimeout(timer);

    // Handle 401 Unauthorized by trying to refresh token
    if (res.status === 401 && endpoint !== "/auth/refresh" && endpoint !== "/auth/login" && endpoint !== "/auth/signup") {
      try {
        const refreshRes = await request<{ accessToken: string }>("/auth/refresh", { method: "POST" });
        if (refreshRes.success && refreshRes.data?.accessToken) {
          const newAccessToken = refreshRes.data.accessToken;
          if (typeof window !== "undefined") {
            localStorage.setItem("eb_token", newAccessToken);
            document.cookie = `access_token=${newAccessToken}; path=/; max-age=900; SameSite=Lax`;
            try {
              const rawUser = localStorage.getItem("eb_user");
              if (rawUser) {
                const user = JSON.parse(rawUser);
                if (user?.role) {
                  document.cookie = `user_role=${user.role}; path=/; max-age=900; SameSite=Lax`;
                }
              }
            } catch {}
          }
          // Retry the request with new token
          return request<T>(endpoint, options, newAccessToken);
        } else {
          // Refresh failed - log out and redirect
          if (typeof window !== "undefined") {
            localStorage.removeItem("eb_user");
            localStorage.removeItem("eb_token");
            document.cookie = "access_token=; path=/; max-age=0";
            window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
          }
        }
      } catch (refreshErr) {
        console.error("[api] Token refresh failed:", refreshErr);
      }
    }

    // Handle non-JSON bodies (e.g. Next.js proxy returning HTML when backend is down)
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return {
        success: false,
        error:
          res.status === 404
            ? "API route not found. Check the endpoint path."
            : "Cannot reach the Express server. " +
              "Run: cd server && npm run dev  (and make sure MongoDB is running).",
      };
    }

    const body: ApiResponse<T> = await res.json();

    if (process.env.NODE_ENV === "development" && !body.success) {
      console.warn("[api] Non-success response:", body);
    }

    return body;
  } catch (err: unknown) {
    clearTimeout(timer);

    // ── Timeout ───────────────────────────────────────────────────────────
    if (err instanceof DOMException && err.name === "AbortError") {
      return {
        success: false,
        error: `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s. ` +
               "Run: cd server && npm run dev",
      };
    }

    // ── Network / CORS / connection refused ───────────────────────────────
    if (err instanceof TypeError) {
      return {
        success: false,
        error:
          "Cannot reach the server. " +
          "Run: cd server && npm run dev",
      };
    }

    // ── Unexpected ────────────────────────────────────────────────────────
    console.error("[api] Unexpected fetch error:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}

// ─── Shared error-message extractor ──────────────────────────────────────────

/**
 * Turn an ApiResponse into a single user-readable error string.
 * Handles both top-level errors and express-validator detail arrays.
 */
export function extractError(res: ApiResponse<unknown>): string {
  if (res.details?.length) {
    // Join all validation messages, deduplicated
    const msgs = [...new Set(res.details.map((d) => d.msg).filter(Boolean))];
    return msgs.join(". ");
  }
  return res.error ?? "Something went wrong. Please try again.";
}

/**
 * Build a field → error-message map from a validation error response.
 * Keys match the `path` field from express-validator.
 *
 * Example:  { email: "Enter a valid email address", password: "..." }
 */
export function extractFieldErrors(
  res: ApiResponse<unknown>
): Record<string, string> {
  const map: Record<string, string> = {};
  if (res.details?.length) {
    for (const d of res.details) {
      if (d.path && !map[d.path]) {
        map[d.path] = d.msg;
      }
    }
  }
  return map;
}

// ─── Auth endpoints ───────────────────────────────────────────────────────────

export const authApi = {
  signup: (body: {
    name: string;
    email: string;
    password: string;
    role: "attendee" | "organizer";
  }) =>
    request<{ user: ApiUser; accessToken: string }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    request<{ user: ApiUser; accessToken: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  logout: (token: string) =>
    request("/auth/logout", { method: "POST" }, token),

  refresh: () =>
    request<{ accessToken: string }>("/auth/refresh", { method: "POST" }),

  me: (token: string) =>
    request<{ user: ApiUser }>("/auth/me", {}, token),

  forgotPassword: (email: string) =>
    request("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (body: { token: string; password?: string }) =>
    request("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  verifyEmail: (token: string) =>
    request(`/auth/verify-email/${token}`, {
      method: "GET",
    }),

  resendVerification: (authToken: string) =>
    request("/auth/resend-verification", {
      method: "POST",
    }, authToken),

  googleLogin: (credential: string) =>
    request<{ user: ApiUser; accessToken: string; isNewUser: boolean }>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential }),
    }),
};

// ─── Event endpoints ──────────────────────────────────────────────────────────

export type EventListParams = {
  category?: string;
  city?: string;
  search?: string;
  featured?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
};

export const eventApi = {
  list: (params: EventListParams = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "" && v !== null) {
        qs.set(k, String(v));
      }
    });
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return request<{ events: ApiEvent[]; pagination: PaginationMeta }>(
      `/events${query}`
    );
  },

  get: (idOrSlug: string, token?: string) =>
    request<{ event: ApiEvent }>(`/events/${idOrSlug}`, {}, token),

  create: (body: Record<string, unknown>, token: string) =>
    request<{ event: ApiEvent }>(
      "/events",
      { method: "POST", body: JSON.stringify(body) },
      token
    ),

  update: (id: string, body: Record<string, unknown>, token: string) =>
    request<{ event: ApiEvent }>(
      `/events/${id}`,
      { method: "PATCH", body: JSON.stringify(body) },
      token
    ),

  publish: (id: string, token: string) =>
    request<{ event: ApiEvent }>(
      `/events/${id}/publish`,
      { method: "PATCH" },
      token
    ),

  delete: (id: string, token: string) =>
    request(`/events/${id}`, { method: "DELETE" }, token),

  suggest: (q: string) =>
    request<{ suggestions: { _id: string; title: string; category: string; venue: { city: string }; slug: string }[] }>(
      `/events/suggest?q=${encodeURIComponent(q)}`
    ),

  myEvents: (
    params: { status?: string; page?: number } = {},
    token: string
  ) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) qs.set(k, String(v));
    });
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return request<{ events: ApiEvent[]; pagination: PaginationMeta }>(
      `/events/my${query}`,
      {},
      token
    );
  },
};

// ─── Types for orders & tickets ───────────────────────────────────────────────

export interface ApiTicket {
  _id: string;
  ticketCode: string;
  qrPayload: string;
  status: "valid" | "used" | "cancelled" | "refunded" | "transferred";
  tierSnapshot: { tierId: string; name: string; type: string; price: number };
  attendeeInfo: { name: string; email: string; phone: string };
  event: Pick<ApiEvent, "_id" | "title" | "startDate" | "endDate" | "venue" | "coverImage" | "timezone">;
  order: { _id: string; orderNumber: string; total: number; confirmedAt: string };
  checkedInAt: string | null;
  createdAt: string;
}

export interface ApiOrder {
  _id: string;
  orderNumber: string;
  subtotal: number;
  serviceFee: number;
  total: number;
  status: string;
  confirmedAt: string;
}

export interface OrganizerStats {
  totalRevenue: number;
  totalOrders: number;
  totalTickets: number;
  activeEvents: number;
  monthlyRevenue: { month: string; revenue: number; orders: number }[];
  recentOrders: {
    orderNumber: string;
    buyer: { name: string; email: string };
    event: { title: string };
    total: number;
    ticketCount: number;
    confirmedAt: string;
  }[];
}

// ─── Order endpoints ──────────────────────────────────────────────────────────

export const orderApi = {
  create: (
    body: {
      eventId: string;
      lines: { tierId: string; quantity: number }[];
      billingInfo: { name: string; email: string; phone?: string };
    },
    token: string
  ) =>
    request<{ order: ApiOrder; tickets: ApiTicket[]; event: Partial<ApiEvent> }>(
      "/orders",
      { method: "POST", body: JSON.stringify(body) },
      token
    ),

  my: (token: string) =>
    request<{ orders: (ApiOrder & { event: Partial<ApiEvent> })[] }>("/orders/my", {}, token),

  organizerStats: (token: string) =>
    request<OrganizerStats>("/orders/organizer-stats", {}, token),
};

// ─── Payment (Stripe) endpoints ──────────────────────────────────────────────

export const paymentApi = {
  createSession: (
    body: {
      eventId: string;
      lines: { tierId: string; quantity: number }[];
      billingInfo: { name: string; email: string; phone?: string };
    },
    token: string
  ) =>
    request<{ sessionId: string; url: string; orderId: string }>(
      "/payments/create-session",
      { method: "POST", body: JSON.stringify(body) },
      token
    ),

  getSession: (sessionId: string, token: string) =>
    request<{
      status: string;
      order: ApiOrder;
      tickets: ApiTicket[];
      event: Partial<ApiEvent>;
    }>(`/payments/session/${sessionId}`, {}, token),
};

// ─── Ticket endpoints ─────────────────────────────────────────────────────────

export const ticketApi = {
  my: (token: string) =>
    request<{ tickets: ApiTicket[] }>("/tickets/my", {}, token),

  validate: (
    body: { ticketCode?: string; ticketId?: string; qrPayload?: string },
    token: string
  ) =>
    request<{
      valid: boolean;
      ticket: {
        ticketCode: string;
        tierName: string;
        tierType: string;
        attendeeName: string;
        attendeeEmail: string;
        eventTitle: string;
        eventDate: string;
        checkedInAt: string;
      };
    }>("/tickets/validate", { method: "POST", body: JSON.stringify(body) }, token),

  resend: (ticketId: string, token: string) =>
    request(`/tickets/${ticketId}/resend`, { method: "POST" }, token),
};

// ─── Promo code endpoints ─────────────────────────────────────────────────────

export interface ApiPromoCode {
  _id: string;
  code: string;
  event: { _id: string; title: string } | null;
  discountType: "percent" | "fixed";
  discountValue: number;
  usageLimit: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  isValid: boolean;
  createdAt: string;
}

export const promoCodeApi = {
  validate: (body: { code: string; eventId?: string; subtotal: number }, token: string) =>
    request<{
      valid: boolean;
      promoCodeId: string;
      code: string;
      discountType: "percent" | "fixed";
      discountValue: number;
      discountAmount: number;
    }>("/promo-codes/validate", { method: "POST", body: JSON.stringify(body) }, token),

  list: (token: string) =>
    request<{ promoCodes: ApiPromoCode[] }>("/promo-codes", {}, token),

  create: (
    body: {
      code: string;
      eventId?: string;
      discountType: "percent" | "fixed";
      discountValue: number;
      usageLimit?: number;
      expiresAt?: string;
    },
    token: string
  ) => request<{ promoCode: ApiPromoCode }>("/promo-codes", { method: "POST", body: JSON.stringify(body) }, token),

  update: (id: string, body: Partial<ApiPromoCode>, token: string) =>
    request<{ promoCode: ApiPromoCode }>(`/promo-codes/${id}`, { method: "PATCH", body: JSON.stringify(body) }, token),

  delete: (id: string, token: string) =>
    request(`/promo-codes/${id}`, { method: "DELETE" }, token),
};

// ─── Order action endpoints ────────────────────────────────────────────────────

export const orderActionsApi = {
  refund: (orderId: string, reason: string, token: string) =>
    request<{ orderNumber: string; refundAmount: number }>(
      `/orders/${orderId}/refund`,
      { method: "POST", body: JSON.stringify({ reason }) },
      token
    ),

  exportAttendeesUrl: (eventId: string) =>
    `${API_BASE}/orders/events/${eventId}/attendees/export`,
};

// ─── Admin endpoints ──────────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number;
  organizers: number;
  totalEvents: number;
  publishedEvents: number;
  totalOrders: number;
  totalRevenue: number;
}

export const adminApi = {
  stats: (token: string) =>
    request<AdminStats>("/admin/stats", {}, token),

  users: (params: { page?: number; limit?: number; search?: string; role?: string } = {}, token: string) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) qs.set(k, String(v)); });
    return request<{
      users: (ApiUser & { _id: string; isActive: boolean; lastLoginAt: string | null; createdAt: string })[];
      pagination: PaginationMeta;
    }>(`/admin/users${qs.toString() ? `?${qs}` : ""}`, {}, token);
  },

  updateUser: (id: string, body: { role?: string; isActive?: boolean }, token: string) =>
    request<{ user: ApiUser }>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) }, token),

  events: (params: { page?: number; status?: string } = {}, token: string) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) qs.set(k, String(v)); });
    return request<{ events: ApiEvent[]; pagination: PaginationMeta }>(
      `/admin/events${qs.toString() ? `?${qs}` : ""}`,
      {},
      token
    );
  },
};

// ─── Support / Contact endpoints ──────────────────────────────────────────────

export const supportApi = {
  submitTicket: (body: { name: string; email: string; subject: string; message: string }) =>
    request<{ success: boolean; message: string }>("/support", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

