import { createClient } from "npm:@supabase/supabase-js@2";

type ApiUser = {
  id: string;
  email?: string | null;
};

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: "admin" | "owner" | "viewer";
  has_ai_access: boolean;
  must_change_password: boolean;
};

type CourseLookupCandidate = {
  name: string;
  formatted_address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  source_place_id: string | null;
  verification_status: "verified";
  verification_source: "google_places";
};

const passportEntrySchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "entry_type",
    "title",
    "course",
    "round",
    "achievement",
    "tournament",
    "story",
    "tags",
    "visibility",
    "confidence",
    "questions",
  ],
  properties: {
    entry_type: {
      type: "string",
      enum: ["course_played", "round", "achievement", "tournament", "memory"],
    },
    title: { type: "string" },
    course: {
      type: "object",
      additionalProperties: false,
      required: ["name", "city", "state", "country"],
      properties: {
        name: { type: ["string", "null"] },
        city: { type: ["string", "null"] },
        state: { type: ["string", "null"] },
        country: { type: ["string", "null"] },
      },
    },
    round: {
      type: "object",
      additionalProperties: false,
      required: ["played_on", "score", "holes", "highlight"],
      properties: {
        played_on: { type: ["string", "null"] },
        score: { type: ["number", "null"] },
        holes: { type: ["number", "null"] },
        highlight: { type: ["string", "null"] },
      },
    },
    achievement: {
      type: "object",
      additionalProperties: false,
      required: ["type", "value"],
      properties: {
        type: { type: ["string", "null"] },
        value: { type: ["string", "null"] },
      },
    },
    tournament: {
      type: "object",
      additionalProperties: false,
      required: ["name", "division", "finish"],
      properties: {
        name: { type: ["string", "null"] },
        division: { type: ["string", "null"] },
        finish: { type: ["string", "null"] },
      },
    },
    story: { type: "string" },
    tags: {
      type: "array",
      items: { type: "string" },
    },
    visibility: {
      type: "string",
      enum: ["public", "unlisted", "private"],
    },
    confidence: {
      type: "string",
      enum: ["high", "medium", "low"],
    },
    questions: {
      type: "array",
      items: { type: "string" },
    },
  },
};

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

const photoBucket = "passport-photos";

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function optionalEnv(name: string) {
  return Deno.env.get(name) || "";
}

function env(name: string) {
  const value = optionalEnv(name);
  if (!value) throw new ApiError(500, `Missing ${name}`);
  return value;
}

function adminClient() {
  return createClient(
    optionalEnv("JGP_SUPABASE_URL") || env("SUPABASE_URL"),
    optionalEnv("JGP_SUPABASE_SERVICE_ROLE_KEY") || env("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { persistSession: false },
    },
  );
}

function jsonResponse(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json; charset=utf-8",
    },
  });
}

async function readJson(req: Request) {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? body as Record<string, unknown> : {};
  } catch {
    throw new ApiError(400, "Invalid JSON request");
  }
}

async function requireUser(req: Request): Promise<ApiUser> {
  const auth = req.headers.get("authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new ApiError(401, "Missing user token");

  const { data, error } = await adminClient().auth.getUser(match[1]);
  if (error || !data.user) {
    throw new ApiError(401, error?.message || "Invalid user token");
  }

  return { id: data.user.id, email: data.user.email };
}

async function requireProfile(user: ApiUser): Promise<Profile> {
  const { data, error } = await adminClient()
    .from("profiles")
    .select("id,email,display_name,role,has_ai_access,must_change_password")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new ApiError(500, error.message);
  if (!data) throw new ApiError(403, "Profile not found");
  return data as Profile;
}

async function requireReadyUser(req: Request): Promise<{ user: ApiUser; profile: Profile }> {
  const user = await requireUser(req);
  const profile = await requireProfile(user);
  if (profile.must_change_password) {
    throw new ApiError(403, "Update the temporary password before editing this passport");
  }
  return { user, profile };
}

async function requireEditableGolfer(userId: string, golferId: string) {
  const { data: profile, error: profileError } = await adminClient()
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) throw new ApiError(500, profileError.message);
  if (profile?.role === "admin") return;

  const { data, error } = await adminClient()
    .from("golfer_members")
    .select("member_role")
    .eq("golfer_id", golferId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new ApiError(500, error.message);
  const role = data?.member_role;
  if (!data || !["owner", "editor"].includes(String(role))) {
    throw new ApiError(403, "You do not have access to edit this golfer");
  }
}

function cleanString(value: unknown, fallback = "") {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

function cleanNullableString(value: unknown) {
  const text = cleanString(value);
  return text || null;
}

function cleanDate(value: unknown) {
  const text = cleanString(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function cleanNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function cleanBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function cleanVisibility(value: unknown) {
  const text = cleanString(value, "private");
  return ["public", "unlisted", "private"].includes(text) ? text : "private";
}

function cleanEntryType(value: unknown) {
  const text = cleanString(value, "memory");
  return ["course_played", "round", "achievement", "tournament", "memory"].includes(text)
    ? text
    : "memory";
}

function cleanLinkedType(value: unknown) {
  const text = cleanString(value);
  return ["round", "memory", "achievement", "tournament", "golfer"].includes(text) ? text : null;
}

function cleanEntryKind(value: unknown) {
  const text = cleanString(value);
  return ["rounds", "memories", "achievements", "tournaments", "photos"].includes(text) ? text : "";
}

function cleanCourseVerificationStatus(value: unknown) {
  const text = cleanString(value, "manual");
  return ["manual", "ai_suggested", "verified", "needs_review"].includes(text) ? text : "manual";
}

function cleanCourseVerificationSource(value: unknown) {
  const text = cleanString(value, "manual_admin");
  return ["google_places", "manual_admin", "imported", "unknown"].includes(text)
    ? text
    : "manual_admin";
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => cleanString(item)).filter(Boolean).slice(0, 12);
}

function addressComponent(place: Record<string, unknown>, type: string) {
  const components = Array.isArray(place.addressComponents) ? place.addressComponents : [];
  for (const component of components) {
    if (!component || typeof component !== "object") continue;
    const row = component as Record<string, unknown>;
    const types = Array.isArray(row.types) ? row.types : [];
    if (types.includes(type)) return cleanNullableString(row.longText);
  }
  return null;
}

function normalizePlaceCandidate(place: Record<string, unknown>): CourseLookupCandidate {
  const displayName = place.displayName && typeof place.displayName === "object"
    ? cleanString((place.displayName as Record<string, unknown>).text)
    : "";
  const location = place.location && typeof place.location === "object"
    ? place.location as Record<string, unknown>
    : {};
  const state = addressComponent(place, "administrative_area_level_1");

  return {
    name: displayName || cleanString(place.formattedAddress),
    formatted_address: cleanNullableString(place.formattedAddress),
    city: addressComponent(place, "locality") ||
      addressComponent(place, "postal_town") ||
      addressComponent(place, "administrative_area_level_2"),
    state,
    country: addressComponent(place, "country") || "United States",
    latitude: cleanNumber(location.latitude),
    longitude: cleanNumber(location.longitude),
    source_place_id: cleanNullableString(place.id),
    verification_status: "verified",
    verification_source: "google_places",
  };
}

async function addSignedPhotoUrls<T extends Record<string, unknown>>(
  photos: T[],
  expiresIn = 60 * 60,
) {
  if (!photos.length) return [];

  const signed = await Promise.all(photos.map(async (photo) => {
    const storagePath = cleanString(photo.storage_path);
    if (!storagePath) return { ...photo, signed_url: null };

    const { data, error } = await adminClient()
      .storage
      .from(photoBucket)
      .createSignedUrl(storagePath, expiresIn);

    return {
      ...photo,
      signed_url: error ? null : data?.signedUrl || null,
    };
  }));

  return signed;
}

async function handleMe(req: Request) {
  const user = await requireUser(req);
  const profile = await requireProfile(user);
  return jsonResponse(200, { user, profile, golfers: await dashboardGolfers(user.id, profile) });
}

async function handlePasswordUpdated(req: Request) {
  const user = await requireUser(req);
  const { data, error } = await adminClient()
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", user.id)
    .select("id,email,display_name,role,has_ai_access,must_change_password")
    .single();

  if (error) throw new ApiError(500, error.message);
  return jsonResponse(200, { profile: data });
}

function handleFeatures() {
  return jsonResponse(200, {
    built_in_ai_configured: Boolean(optionalEnv("OPENAI_API_KEY")),
    course_lookup_configured: Boolean(
      optionalEnv("GOOGLE_PLACES_API_KEY") || optionalEnv("GOOGLE_MAPS_API_KEY"),
    ),
  });
}

async function handlePublicGolfer(slug: string) {
  const { data: golfer, error } = await adminClient()
    .from("golfers")
    .select("*")
    .eq("slug", slug)
    .in("visibility", ["public", "unlisted"])
    .maybeSingle();

  if (error) throw new ApiError(500, error.message);
  if (!golfer) throw new ApiError(404, "Golfer not found");

  const [rounds, memories, achievements, tournaments, photos] = await Promise.all([
    adminClient()
      .from("rounds")
      .select("*,courses(*)")
      .eq("golfer_id", golfer.id)
      .eq("is_approved", true)
      .in("visibility", ["public", "unlisted"])
      .order("played_on", { ascending: false }),
    adminClient()
      .from("memories")
      .select("*,courses(*)")
      .eq("golfer_id", golfer.id)
      .eq("is_approved", true)
      .in("visibility", ["public", "unlisted"])
      .order("created_at", { ascending: false }),
    adminClient()
      .from("achievements")
      .select("*,courses(*)")
      .eq("golfer_id", golfer.id)
      .eq("is_approved", true)
      .in("visibility", ["public", "unlisted"])
      .order("created_at", { ascending: false }),
    adminClient()
      .from("tournaments")
      .select("*,courses(*)")
      .eq("golfer_id", golfer.id)
      .eq("is_approved", true)
      .in("visibility", ["public", "unlisted"])
      .order("played_on", { ascending: false }),
    adminClient()
      .from("photos")
      .select("*")
      .eq("golfer_id", golfer.id)
      .eq("is_approved", true)
      .in("visibility", ["public", "unlisted"])
      .order("created_at", { ascending: false }),
  ]);

  for (const result of [rounds, memories, achievements, tournaments, photos]) {
    if (result.error) throw new ApiError(500, result.error.message);
  }

  return jsonResponse(200, {
    golfer,
    rounds: rounds.data || [],
    memories: memories.data || [],
    achievements: achievements.data || [],
    tournaments: tournaments.data || [],
    photos: await addSignedPhotoUrls(photos.data || []),
  });
}

async function handleDashboardGolfers(req: Request) {
  const user = await requireUser(req);
  const profile = await requireProfile(user);
  return jsonResponse(200, { golfers: await dashboardGolfers(user.id, profile) });
}

async function dashboardGolfers(userId: string, profile: Profile) {
  if (profile.role === "admin") {
    const { data, error } = await adminClient()
      .from("golfers")
      .select("id,slug,display_name,headline,visibility")
      .order("display_name", { ascending: true });

    if (error) throw new ApiError(500, error.message);
    return (data || []).map((golfer) => ({
      member_role: "admin",
      golfers: golfer,
    }));
  }

  const { data, error } = await adminClient()
    .from("golfer_members")
    .select("member_role,golfers(id,slug,display_name,headline,visibility)")
    .eq("user_id", userId);

  if (error) throw new ApiError(500, error.message);
  return data || [];
}

async function handleDashboardEntries(req: Request, golferId: string) {
  const user = await requireUser(req);
  if (!golferId) throw new ApiError(400, "golfer_id is required");
  await requireEditableGolfer(user.id, golferId);

  const [rounds, memories, achievements, tournaments, photos] = await Promise.all([
    adminClient()
      .from("rounds")
      .select("*,courses(*)")
      .eq("golfer_id", golferId)
      .order("created_at", { ascending: false })
      .limit(30),
    adminClient()
      .from("memories")
      .select("*,courses(*)")
      .eq("golfer_id", golferId)
      .order("created_at", { ascending: false })
      .limit(30),
    adminClient()
      .from("achievements")
      .select("*,courses(*)")
      .eq("golfer_id", golferId)
      .order("created_at", { ascending: false })
      .limit(30),
    adminClient()
      .from("tournaments")
      .select("*,courses(*)")
      .eq("golfer_id", golferId)
      .order("created_at", { ascending: false })
      .limit(30),
    adminClient()
      .from("photos")
      .select("*")
      .eq("golfer_id", golferId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  for (const result of [rounds, memories, achievements, tournaments, photos]) {
    if (result.error) throw new ApiError(500, result.error.message);
  }

  return jsonResponse(200, {
    rounds: rounds.data || [],
    memories: memories.data || [],
    achievements: achievements.data || [],
    tournaments: tournaments.data || [],
    photos: await addSignedPhotoUrls(photos.data || []),
  });
}

async function handleCreateGolfer(req: Request) {
  const { user } = await requireReadyUser(req);
  const body = await readJson(req);
  const displayName = cleanString(body.display_name);
  const slug = cleanString(body.slug)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!displayName) throw new ApiError(400, "Golfer name is required");
  if (!slug) throw new ApiError(400, "Golfer slug is required");

  const { data: golfer, error } = await adminClient()
    .from("golfers")
    .insert({
      slug,
      display_name: displayName,
      headline: cleanNullableString(body.headline) ||
        "Courses played, memories made, milestones earned.",
      bio: cleanNullableString(body.bio),
      home_state: cleanNullableString(body.home_state),
      visibility: cleanVisibility(body.visibility),
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") throw new ApiError(409, "That public slug is already taken");
    throw new ApiError(500, error.message);
  }

  const membership = await adminClient()
    .from("golfer_members")
    .insert({
      golfer_id: golfer.id,
      user_id: user.id,
      member_role: "owner",
    });
  if (membership.error) throw new ApiError(500, membership.error.message);

  return jsonResponse(201, { golfer });
}

async function upsertCourse(body: Record<string, unknown>) {
  const name = cleanString(body.name);
  if (!name) throw new ApiError(400, "Course name is required");

  const { data, error } = await adminClient()
    .from("courses")
    .insert({
      name,
      city: cleanNullableString(body.city),
      state: cleanNullableString(body.state),
      country: cleanString(body.country, "United States"),
      latitude: cleanNumber(body.latitude),
      longitude: cleanNumber(body.longitude),
      verification_status: cleanCourseVerificationStatus(body.verification_status),
      verification_source: cleanCourseVerificationSource(body.verification_source),
      source_place_id: cleanNullableString(body.source_place_id),
    })
    .select("*")
    .single();

  if (error) throw new ApiError(500, error.message);
  return data;
}

async function handleCreateCourse(req: Request) {
  await requireReadyUser(req);
  const course = await upsertCourse(await readJson(req));
  return jsonResponse(201, { course });
}

async function handleLookupCourse(req: Request) {
  const { user } = await requireReadyUser(req);
  const body = await readJson(req);
  const golferId = cleanString(body.golfer_id);
  if (golferId) await requireEditableGolfer(user.id, golferId);

  const query = cleanString(body.query) ||
    [
      cleanString(body.name),
      cleanString(body.city),
      cleanString(body.state),
      cleanString(body.country, "United States"),
    ].filter(Boolean).join(", ");
  if (!query) throw new ApiError(400, "Course name or search text is required");

  const apiKey = optionalEnv("GOOGLE_PLACES_API_KEY") || optionalEnv("GOOGLE_MAPS_API_KEY");
  if (!apiKey) {
    throw new ApiError(503, "Course lookup needs the GOOGLE_PLACES_API_KEY Supabase secret");
  }

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey,
      "x-goog-fieldmask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.addressComponents,places.types",
    },
    body: JSON.stringify({
      textQuery: `${query} golf course`,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload?.error?.message === "string"
      ? payload.error.message
      : "Course lookup failed";
    throw new ApiError(502, message);
  }

  const places: unknown[] = Array.isArray(payload.places) ? payload.places : [];
  const candidates = places
    .map((place: unknown) => normalizePlaceCandidate(place as Record<string, unknown>))
    .filter((candidate: CourseLookupCandidate) =>
      candidate.name && candidate.latitude !== null && candidate.longitude !== null
    )
    .slice(0, 5);

  return jsonResponse(200, { query, candidates });
}

async function handleCreateRound(req: Request) {
  const { user } = await requireReadyUser(req);
  const body = await readJson(req);
  const golferId = cleanString(body.golfer_id);
  if (!golferId) throw new ApiError(400, "golfer_id is required");
  await requireEditableGolfer(user.id, golferId);

  const { data, error } = await adminClient()
    .from("rounds")
    .insert({
      golfer_id: golferId,
      course_id: cleanNullableString(body.course_id),
      played_on: cleanDate(body.played_on),
      score: cleanNumber(body.score),
      holes: cleanNumber(body.holes),
      tees: cleanNullableString(body.tees),
      notes: cleanNullableString(body.notes),
      story: cleanNullableString(body.story),
      visibility: cleanVisibility(body.visibility),
      is_approved: cleanBoolean(body.is_approved),
      created_by: user.id,
    })
    .select("*,courses(*)")
    .single();

  if (error) throw new ApiError(500, error.message);
  return jsonResponse(201, { round: data });
}

async function handleCreateMemory(req: Request) {
  const { user } = await requireReadyUser(req);
  const body = await readJson(req);
  const golferId = cleanString(body.golfer_id);
  if (!golferId) throw new ApiError(400, "golfer_id is required");
  await requireEditableGolfer(user.id, golferId);

  const title = cleanString(body.title);
  if (!title) throw new ApiError(400, "Title is required");

  const { data, error } = await adminClient()
    .from("memories")
    .insert({
      golfer_id: golferId,
      course_id: cleanNullableString(body.course_id),
      round_id: cleanNullableString(body.round_id),
      title,
      entry_type: cleanEntryType(body.entry_type),
      story: cleanNullableString(body.story),
      raw_note: cleanNullableString(body.raw_note),
      tags: stringArray(body.tags),
      visibility: cleanVisibility(body.visibility),
      is_approved: cleanBoolean(body.is_approved),
      created_by: user.id,
    })
    .select("*,courses(*)")
    .single();

  if (error) throw new ApiError(500, error.message);
  return jsonResponse(201, { memory: data });
}

async function handleCreateAchievement(req: Request) {
  const { user } = await requireReadyUser(req);
  const body = await readJson(req);
  const golferId = cleanString(body.golfer_id);
  if (!golferId) throw new ApiError(400, "golfer_id is required");
  await requireEditableGolfer(user.id, golferId);

  const title = cleanString(body.title);
  if (!title) throw new ApiError(400, "Title is required");

  const { data, error } = await adminClient()
    .from("achievements")
    .insert({
      golfer_id: golferId,
      title,
      achievement_type: cleanNullableString(body.achievement_type),
      achieved_on: cleanDate(body.achieved_on),
      course_id: cleanNullableString(body.course_id),
      round_id: cleanNullableString(body.round_id),
      value: cleanNullableString(body.value),
      story: cleanNullableString(body.story),
      visibility: cleanVisibility(body.visibility),
      is_approved: cleanBoolean(body.is_approved),
      created_by: user.id,
    })
    .select("*,courses(*)")
    .single();

  if (error) throw new ApiError(500, error.message);
  return jsonResponse(201, { achievement: data });
}

async function handleCreateTournament(req: Request) {
  const { user } = await requireReadyUser(req);
  const body = await readJson(req);
  const golferId = cleanString(body.golfer_id);
  if (!golferId) throw new ApiError(400, "golfer_id is required");
  await requireEditableGolfer(user.id, golferId);

  const eventName = cleanString(body.event_name);
  if (!eventName) throw new ApiError(400, "Event name is required");

  const { data, error } = await adminClient()
    .from("tournaments")
    .insert({
      golfer_id: golferId,
      course_id: cleanNullableString(body.course_id),
      event_name: eventName,
      played_on: cleanDate(body.played_on),
      division: cleanNullableString(body.division),
      score: cleanNullableString(body.score),
      finish: cleanNullableString(body.finish),
      result_url: cleanNullableString(body.result_url),
      story: cleanNullableString(body.story),
      visibility: cleanVisibility(body.visibility),
      is_approved: cleanBoolean(body.is_approved),
      created_by: user.id,
    })
    .select("*,courses(*)")
    .single();

  if (error) throw new ApiError(500, error.message);
  return jsonResponse(201, { tournament: data });
}

async function handleCreatePhoto(req: Request) {
  const { user } = await requireReadyUser(req);
  const body = await readJson(req);
  const golferId = cleanString(body.golfer_id);
  if (!golferId) throw new ApiError(400, "golfer_id is required");
  await requireEditableGolfer(user.id, golferId);

  const storagePath = cleanString(body.storage_path);
  if (!storagePath) throw new ApiError(400, "storage_path is required");
  if (!storagePath.startsWith(`${golferId}/`)) {
    throw new ApiError(400, "Photo storage path must belong to the selected golfer");
  }

  const linkedType = cleanLinkedType(body.linked_type);
  const { data, error } = await adminClient()
    .from("photos")
    .insert({
      golfer_id: golferId,
      storage_path: storagePath,
      caption: cleanNullableString(body.caption),
      linked_type: linkedType,
      linked_id: cleanNullableString(body.linked_id),
      visibility: cleanVisibility(body.visibility),
      is_approved: cleanBoolean(body.is_approved),
      uploaded_by: user.id,
    })
    .select("*")
    .single();

  if (error) throw new ApiError(500, error.message);
  const signed = await addSignedPhotoUrls([data]);
  return jsonResponse(201, { photo: signed[0] });
}

async function loadEditableEntry(req: Request, kind: string, id: string) {
  const { user } = await requireReadyUser(req);
  const entryKind = cleanEntryKind(kind);
  if (!entryKind) throw new ApiError(404, "Entry type not found");
  const entryId = cleanString(id);
  if (!entryId) throw new ApiError(400, "Entry id is required");

  const { data, error } = await adminClient()
    .from(entryKind)
    .select("*")
    .eq("id", entryId)
    .maybeSingle();

  if (error) throw new ApiError(500, error.message);
  if (!data) throw new ApiError(404, "Entry not found");

  const golferId = cleanString((data as Record<string, unknown>).golfer_id);
  if (!golferId) throw new ApiError(500, "Entry is missing golfer_id");
  await requireEditableGolfer(user.id, golferId);

  return { user, entryKind, entry: data as Record<string, unknown>, golferId };
}

function updatePayload(kind: string, body: Record<string, unknown>) {
  if (kind === "rounds") {
    return {
      course_id: cleanNullableString(body.course_id),
      played_on: cleanDate(body.played_on),
      score: cleanNumber(body.score),
      holes: cleanNumber(body.holes),
      tees: cleanNullableString(body.tees),
      notes: cleanNullableString(body.notes),
      story: cleanNullableString(body.story),
      visibility: cleanVisibility(body.visibility),
      is_approved: cleanBoolean(body.is_approved),
    };
  }
  if (kind === "memories") {
    const title = cleanString(body.title);
    if (!title) throw new ApiError(400, "Title is required");
    return {
      course_id: cleanNullableString(body.course_id),
      round_id: cleanNullableString(body.round_id),
      title,
      entry_type: cleanEntryType(body.entry_type),
      story: cleanNullableString(body.story),
      raw_note: cleanNullableString(body.raw_note),
      tags: stringArray(body.tags),
      visibility: cleanVisibility(body.visibility),
      is_approved: cleanBoolean(body.is_approved),
    };
  }
  if (kind === "achievements") {
    const title = cleanString(body.title);
    if (!title) throw new ApiError(400, "Title is required");
    return {
      title,
      achievement_type: cleanNullableString(body.achievement_type),
      achieved_on: cleanDate(body.achieved_on),
      course_id: cleanNullableString(body.course_id),
      round_id: cleanNullableString(body.round_id),
      value: cleanNullableString(body.value),
      story: cleanNullableString(body.story),
      visibility: cleanVisibility(body.visibility),
      is_approved: cleanBoolean(body.is_approved),
    };
  }
  if (kind === "tournaments") {
    const eventName = cleanString(body.event_name);
    if (!eventName) throw new ApiError(400, "Event name is required");
    return {
      course_id: cleanNullableString(body.course_id),
      event_name: eventName,
      played_on: cleanDate(body.played_on),
      division: cleanNullableString(body.division),
      score: cleanNullableString(body.score),
      finish: cleanNullableString(body.finish),
      result_url: cleanNullableString(body.result_url),
      story: cleanNullableString(body.story),
      visibility: cleanVisibility(body.visibility),
      is_approved: cleanBoolean(body.is_approved),
    };
  }
  if (kind === "photos") {
    return {
      caption: cleanNullableString(body.caption),
      linked_type: cleanLinkedType(body.linked_type),
      linked_id: cleanNullableString(body.linked_id),
      visibility: cleanVisibility(body.visibility),
      is_approved: cleanBoolean(body.is_approved),
    };
  }
  throw new ApiError(404, "Entry type not found");
}

async function handleUpdateEntry(req: Request, kind: string, id: string) {
  const current = await loadEditableEntry(req, kind, id);
  const body = await readJson(req);
  const payload = updatePayload(current.entryKind, body);

  if (current.entryKind === "photos") {
    const { data, error } = await adminClient()
      .from(current.entryKind)
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new ApiError(500, error.message);
    const signed = await addSignedPhotoUrls([data as Record<string, unknown>]);
    return jsonResponse(200, { entry: signed[0] });
  }

  const { data, error } = await adminClient()
    .from(current.entryKind)
    .update(payload)
    .eq("id", id)
    .select("*,courses(*)")
    .single();

  if (error) throw new ApiError(500, error.message);
  return jsonResponse(200, { entry: data });
}

async function handleDeleteEntry(req: Request, kind: string, id: string) {
  const current = await loadEditableEntry(req, kind, id);
  const storagePath = current.entryKind === "photos" ? cleanString(current.entry.storage_path) : "";

  const { error } = await adminClient()
    .from(current.entryKind)
    .delete()
    .eq("id", id);

  if (error) throw new ApiError(500, error.message);

  if (storagePath) {
    await adminClient().storage.from(photoBucket).remove([storagePath]);
  }

  return jsonResponse(200, { deleted: true });
}

function parsePastedEntry(value: unknown) {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ApiError(400, "AI result must be a JSON object");
  }
  const body = parsed as Record<string, unknown>;
  return {
    entry_type: cleanEntryType(body.entry_type),
    title: cleanString(body.title, "Untitled golf memory"),
    course: body.course && typeof body.course === "object" ? body.course : {},
    round: body.round && typeof body.round === "object" ? body.round : {},
    achievement: body.achievement && typeof body.achievement === "object" ? body.achievement : {},
    tournament: body.tournament && typeof body.tournament === "object" ? body.tournament : {},
    story: cleanString(body.story),
    tags: stringArray(body.tags),
    visibility: cleanVisibility(body.visibility),
    confidence: ["high", "medium", "low"].includes(cleanString(body.confidence).toLowerCase())
      ? cleanString(body.confidence).toLowerCase()
      : "low",
    questions: stringArray(body.questions),
  };
}

async function handleParsePastedResult(req: Request) {
  await requireReadyUser(req);
  const body = await readJson(req);
  try {
    return jsonResponse(200, { draft: parsePastedEntry(body.result ?? body) });
  } catch (error) {
    if (error instanceof SyntaxError) throw new ApiError(400, "Pasted AI result is not valid JSON");
    throw error;
  }
}

function aiPrompt(note: string) {
  return `You are helping turn a junior golfer's rough golf note into a structured Junior Golf Passport entry.

Return only valid JSON. Do not include markdown. Do not include comments. If you are unsure about a value, use null and add a question in the questions array. Do not invent scores, dates, or locations.

Rough note:
"""
${note}
"""

Return JSON with this shape:
{
  "entry_type": "course_played | round | achievement | tournament | memory",
  "title": "short title",
  "course": {
    "name": "course name or null",
    "city": "city or null",
    "state": "state or null",
    "country": "country or null"
  },
  "round": {
    "played_on": "YYYY-MM-DD or null",
    "score": null,
    "holes": null,
    "highlight": "short highlight or null"
  },
  "achievement": {
    "type": "achievement type or null",
    "value": "achievement value or null"
  },
  "tournament": {
    "name": "event name or null",
    "division": "division or null",
    "finish": "finish or null"
  },
  "story": "polished public-friendly story draft",
  "tags": ["tag one", "tag two"],
  "visibility": "private",
  "confidence": "high | medium | low",
  "questions": ["question one if needed"]
}`;
}

async function handleDraftEntry(req: Request) {
  const { user, profile } = await requireReadyUser(req);
  if (!profile.has_ai_access) {
    throw new ApiError(402, "Built-in AI requires AI access. Use Your Own AI is free.");
  }

  const body = await readJson(req);
  const note = cleanString(body.note);
  if (!note) throw new ApiError(400, "A rough note is required");

  const startedAt = new Date().toISOString();
  const model = optionalEnv("OPENAI_MODEL") || "gpt-4o-mini";
  let aiRequestId: string | null = null;

  const insert = await adminClient()
    .from("ai_requests")
    .insert({
      user_id: user.id,
      golfer_id: cleanNullableString(body.golfer_id),
      request_type: "draft_entry",
      model,
      status: "pending",
    })
    .select("id")
    .single();
  if (insert.error) throw new ApiError(500, insert.error.message);
  aiRequestId = insert.data.id;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "authorization": `Bearer ${env("OPENAI_API_KEY")}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: aiPrompt(note),
        text: {
          format: {
            type: "json_schema",
            name: "passport_entry",
            strict: true,
            schema: passportEntrySchema,
          },
        },
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new ApiError(502, result?.error?.message || "OpenAI request failed");
    }

    const outputText = result.output_text ||
      result.output?.flatMap((item: Record<string, unknown>) =>
        Array.isArray(item.content) ? item.content : []
      )
        ?.map((content: Record<string, unknown>) => content.text)
        ?.filter(Boolean)
        ?.join("\n");

    const draft = parsePastedEntry(String(outputText || ""));
    await adminClient()
      .from("ai_requests")
      .update({
        status: "succeeded",
        provider_request_id: result.id || null,
        token_usage_json: result.usage || {},
        completed_at: new Date().toISOString(),
      })
      .eq("id", aiRequestId);

    return jsonResponse(200, { draft, ai_request_id: aiRequestId, started_at: startedAt });
  } catch (error) {
    await adminClient()
      .from("ai_requests")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "AI request failed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", aiRequestId);
    throw error;
  }
}

async function route(req: Request) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const pathname = url.pathname.replace(/^\/passport-api/, "") || "/";

  if (req.method === "GET" && pathname === "/features") return handleFeatures();
  if (req.method === "GET" && pathname === "/me") return handleMe(req);
  if (req.method === "POST" && pathname === "/me/password-updated") {
    return handlePasswordUpdated(req);
  }
  if (req.method === "GET" && pathname === "/dashboard/golfers") return handleDashboardGolfers(req);
  const dashboardEntriesMatch = pathname.match(/^\/dashboard\/golfers\/([^/]+)\/entries$/);
  if (req.method === "GET" && dashboardEntriesMatch) {
    return handleDashboardEntries(req, dashboardEntriesMatch[1]);
  }
  if (req.method === "POST" && pathname === "/golfers") return handleCreateGolfer(req);

  const publicGolferMatch = pathname.match(/^\/golfers\/([^/]+)\/public$/);
  if (req.method === "GET" && publicGolferMatch) {
    return handlePublicGolfer(publicGolferMatch[1].toLowerCase());
  }

  const entryMatch = pathname.match(/^\/entries\/([^/]+)\/([^/]+)$/);
  if (entryMatch && req.method === "PATCH") {
    return handleUpdateEntry(req, entryMatch[1], entryMatch[2]);
  }
  if (entryMatch && req.method === "DELETE") {
    return handleDeleteEntry(req, entryMatch[1], entryMatch[2]);
  }

  if (req.method === "POST" && pathname === "/courses") return handleCreateCourse(req);
  if (req.method === "POST" && pathname === "/courses/lookup") return handleLookupCourse(req);
  if (req.method === "POST" && pathname === "/rounds") return handleCreateRound(req);
  if (req.method === "POST" && pathname === "/memories") return handleCreateMemory(req);
  if (req.method === "POST" && pathname === "/achievements") return handleCreateAchievement(req);
  if (req.method === "POST" && pathname === "/tournaments") return handleCreateTournament(req);
  if (req.method === "POST" && pathname === "/photos") return handleCreatePhoto(req);
  if (req.method === "POST" && pathname === "/ai/parse-pasted-result") {
    return handleParsePastedResult(req);
  }
  if (req.method === "POST" && pathname === "/ai/draft-entry") return handleDraftEntry(req);

  throw new ApiError(404, "Not found");
}

Deno.serve(async (req) => {
  try {
    return await route(req);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse(status, { error: message });
  }
});
