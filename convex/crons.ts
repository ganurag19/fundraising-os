import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
crons.interval("abuse watch", { hours: 1 }, internal.watch.hourly, {});
crons.cron("follow-up reminders, 9 AM India", "30 3 * * *", internal.notify.sendDigests, {});
crons.cron("free kit upgrade nudges, 10 AM India", "30 4 * * *", internal.notify.sendUpgradeNudges, {});
export default crons;
