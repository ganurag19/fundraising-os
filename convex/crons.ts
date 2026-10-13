import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
crons.interval("abuse watch", { hours: 1 }, internal.watch.hourly, {});
crons.cron("follow-up reminders, 9 AM India", "30 3 * * *", internal.notify.sendDigests, {});
export default crons;
