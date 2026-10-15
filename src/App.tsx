import { Route, Routes } from "react-router-dom";
import Landing from "./landing/Landing";
import Start from "./pages/Start";
import Emails from "./pages/Emails";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import { Privacy, Terms } from "./pages/Legal";
import Admin from "./pages/Admin";
import CompareConsultant from "./pages/CompareConsultant";
import LandingDraft from "./landing/LandingDraft";
import LandingFull from "./landing/LandingFull";
import KitLanding from "./landing/KitLanding";
import Build from "./kit/Build";
import KitApp from "./kit/KitApp";
import Tracker from "./lib/Tracker";

export default function App() {
  return (
    <>
    <Tracker />
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/start" element={<Start />} />
      <Route path="/emails" element={<Emails />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/draft" element={<LandingDraft />} />
      <Route path="/draft-full" element={<LandingFull />} />
      {/* Hidden concept page (noindex, not linked), for feedback. */}
      <Route path="/kit" element={<KitLanding />} />
      {/* The Raise Kit flow (15 Oct): build your kit, then the kit dashboard after Google sign-in. */}
      <Route path="/build" element={<Build />} />
      <Route path="/app" element={<KitApp />} />
      <Route path="/compare/fundraising-consultant" element={<CompareConsultant />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  );
}
