import { httpRouter } from "convex/server";
import { registerStaticRoutes } from "@convex-dev/static-hosting";
import { components } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();
auth.addHttpRoutes(http); // Google sign-in callbacks keep their URLs
registerStaticRoutes(http, components.staticHosting); // everything else: the site
export default http;
