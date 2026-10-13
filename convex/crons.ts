import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
crons.interval("abuse watch", { hours: 1 }, internal.watch.hourly, {});
export default crons;
