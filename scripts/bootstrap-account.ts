import { createClient } from "npm:@supabase/supabase-js@2";

type BootstrapArgs = {
  email: string;
  password?: string;
  displayName: string;
  profileRole: "admin" | "owner" | "viewer";
  memberRole: "owner" | "editor" | "viewer";
  golferSlug?: string;
  hasAiAccess: boolean;
  mustChangePassword: boolean;
  skipMembership: boolean;
};

type AuthUser = {
  id: string;
  email?: string;
};

// This script intentionally avoids generated Supabase database types so it can
// run before the project has a typed client build step.
// deno-lint-ignore no-explicit-any
type SupabaseAdmin = any;

function usage(): never {
  throw new Error(
    [
      "Usage:",
      "  deno run --allow-env --allow-net scripts/bootstrap-account.ts \\",
      "    --email kara@example.com \\",
      "    --password password \\",
      '    --display-name "Kara Walker" \\',
      "    --profile-role owner \\",
      "    --member-role owner \\",
      "    --golfer-slug kara \\",
      "    --has-ai-access true \\",
      "    --must-change-password true",
      "",
      "Required environment:",
      "  JGP_SUPABASE_URL or SUPABASE_URL",
      "  JGP_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY",
    ].join("\n"),
  );
}

function parseCliArgs(argv: string[]) {
  const parsed: Record<string, string | boolean> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) usage();

    const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
    const key = rawKey.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

    if (inlineValue !== undefined) {
      parsed[key] = inlineValue;
      continue;
    }

    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }

    parsed[key] = next;
    index += 1;
  }

  return parsed;
}

function requiredText(args: Record<string, string | boolean>, key: string) {
  const value = args[key];
  if (typeof value !== "string" || !value.trim()) usage();
  return value.trim();
}

function optionalText(args: Record<string, string | boolean>, key: string) {
  const value = args[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function booleanArg(args: Record<string, string | boolean>, key: string, fallback: boolean) {
  const value = args[key];
  if (value === undefined) return fallback;
  if (typeof value === "boolean") return value;
  if (/^(true|1|yes)$/i.test(value)) return true;
  if (/^(false|0|no)$/i.test(value)) return false;
  usage();
}

function choice<T extends string>(
  value: string | undefined,
  fallback: T,
  allowed: readonly T[],
) {
  const candidate = (value || fallback).toLowerCase() as T;
  if (!allowed.includes(candidate)) usage();
  return candidate;
}

function env(name: string, fallbackName: string) {
  return Deno.env.get(name) || Deno.env.get(fallbackName) || "";
}

function bootstrapArgs(): BootstrapArgs {
  const args = parseCliArgs(Deno.args);
  return {
    email: requiredText(args, "email").toLowerCase(),
    password: optionalText(args, "password"),
    displayName: requiredText(args, "displayName"),
    profileRole: choice(
      optionalText(args, "profileRole"),
      "owner",
      [
        "admin",
        "owner",
        "viewer",
      ] as const,
    ),
    memberRole: choice(
      optionalText(args, "memberRole"),
      "owner",
      [
        "owner",
        "editor",
        "viewer",
      ] as const,
    ),
    golferSlug: optionalText(args, "golferSlug") || "kara",
    hasAiAccess: booleanArg(args, "hasAiAccess", false),
    mustChangePassword: booleanArg(args, "mustChangePassword", false),
    skipMembership: booleanArg(args, "skipMembership", false),
  };
}

async function findUserByEmail(
  supabase: SupabaseAdmin,
  email: string,
): Promise<AuthUser | null> {
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const match = data.users.find((user: AuthUser) => user.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function upsertAuthUser(supabase: SupabaseAdmin, args: BootstrapArgs) {
  const existing = await findUserByEmail(supabase, args.email);
  const metadata = { display_name: args.displayName };

  if (existing) {
    const updatePayload: Record<string, unknown> = {
      email: args.email,
      user_metadata: metadata,
    };
    if (args.password) updatePayload.password = args.password;

    const { data, error } = await supabase.auth.admin.updateUserById(
      existing.id,
      updatePayload,
    );
    if (error) throw error;
    return { user: data.user as AuthUser, created: false };
  }

  if (!args.password) {
    throw new Error("Password is required when creating a new account.");
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: args.email,
    password: args.password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error) throw error;
  if (!data.user) throw new Error("Supabase did not return the created user.");
  return { user: data.user as AuthUser, created: true };
}

async function upsertProfile(
  supabase: SupabaseAdmin,
  user: AuthUser,
  args: BootstrapArgs,
) {
  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      email: args.email,
      display_name: args.displayName,
      role: args.profileRole,
      has_ai_access: args.hasAiAccess,
      must_change_password: args.mustChangePassword,
    }, { onConflict: "id" })
    .select("id,email,display_name,role,has_ai_access,must_change_password")
    .single();

  if (error) throw error;
  return data;
}

async function ensureMembership(
  supabase: SupabaseAdmin,
  user: AuthUser,
  args: BootstrapArgs,
) {
  if (args.skipMembership) return null;
  if (!args.golferSlug) throw new Error("golferSlug is required unless skipMembership is true.");

  const { data: golfer, error: golferError } = await supabase
    .from("golfers")
    .select("id,slug,display_name")
    .eq("slug", args.golferSlug)
    .maybeSingle();

  if (golferError) throw golferError;
  if (!golfer) throw new Error(`Golfer slug "${args.golferSlug}" was not found.`);

  const { data, error } = await supabase
    .from("golfer_members")
    .upsert({
      golfer_id: golfer.id,
      user_id: user.id,
      member_role: args.memberRole,
    }, { onConflict: "golfer_id,user_id" })
    .select("id,member_role,golfers(id,slug,display_name)")
    .single();

  if (error) throw error;
  return data;
}

const supabaseUrl = env("JGP_SUPABASE_URL", "SUPABASE_URL");
const serviceRoleKey = env("JGP_SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  usage();
}

const args = bootstrapArgs();
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const { user, created } = await upsertAuthUser(supabase, args);
const profile = await upsertProfile(supabase, user, args);
const membership = await ensureMembership(supabase, user, args);

console.log(JSON.stringify(
  {
    auth_user: {
      id: user.id,
      email: args.email,
      created,
    },
    profile,
    membership,
  },
  null,
  2,
));
