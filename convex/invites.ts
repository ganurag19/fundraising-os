import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const STAGES = ["Idea", "Pre-seed", "Seed", "Pre-Series A", "Series A"];

const normaliseCode = (code: string) => code.trim().toUpperCase().replace(/\s+/g, "");

/** Landing page: "Request invite". Saves the request once per email. */
export const requestInvite = mutation({
  args: { email: v.string(), name: v.string(), company: v.string(), stage: v.string() },
  returns: v.union(
    v.object({ ok: v.literal(true), alreadyOnList: v.boolean() }),
    v.object({ ok: v.literal(false), error: v.string() }),
  ),
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const name = args.name.trim();
    const company = args.company.trim();
    if (!EMAIL.test(email) || email.length > 200) return { ok: false as const, error: "Please enter a valid email." };
    if (!name || name.length > 100) return { ok: false as const, error: "Please enter your name." };
    if (!company || company.length > 100) return { ok: false as const, error: "Please enter your startup's name." };
    if (!STAGES.includes(args.stage)) return { ok: false as const, error: "Please pick your stage." };

    const existing = await ctx.db.query("waitlist").withIndex("by_email", (q) => q.eq("email", email)).unique();
    if (existing) return { ok: true as const, alreadyOnList: true };

    await ctx.db.insert("waitlist", { email, name, company, stage: args.stage, status: "waiting" });
    return { ok: true as const, alreadyOnList: false };
  },
});

/** Landing page: "I have a code". Only says whether the code works; never lists codes. */
export const checkCode = query({
  args: { code: v.string() },
  returns: v.object({ valid: v.boolean() }),
  handler: async (ctx, args) => {
    const code = normaliseCode(args.code);
    if (!code || code.length > 40) return { valid: false };
    const row = await ctx.db.query("inviteCodes").withIndex("by_code", (q) => q.eq("code", code)).unique();
    return { valid: !!row && row.uses < row.maxUses };
  },
});

/** Run from the terminal to make a code: npx convex run invites:createCode '{"code":"GROWTHX-S4","label":"GrowthX","maxUses":50}' */
export const createCode = internalMutation({
  args: { code: v.string(), label: v.string(), maxUses: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const code = normaliseCode(args.code);
    const existing = await ctx.db.query("inviteCodes").withIndex("by_code", (q) => q.eq("code", code)).unique();
    if (existing) throw new Error(`Code ${code} already exists`);
    await ctx.db.insert("inviteCodes", { code, label: args.label, maxUses: Math.max(1, Math.floor(args.maxUses)), uses: 0 });
    return null;
  },
});
