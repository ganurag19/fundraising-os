import { Navigate, Route, Routes, useLocation } from "react-router-dom";
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
      {/* 16 Oct: the Raise Kit page is the main landing page. The previous landing stays at /classic (not linked). */}
      <Route path="/" element={<KitLanding />} />
      <Route path="/classic" element={<Landing />} />
      <Route path="/start" element={<Start />} />
      <Route path="/emails" element={<Emails />} />
      {/* 16 Oct: everyone uses the kit dashboard; the classic one stays at /classic-dashboard (not linked). */}
      <Route path="/dashboard" element={<KitRedirect to="/app" />} />
      <Route path="/classic-dashboard" element={<Dashboard />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/draft" element={<LandingDraft />} />
      <Route path="/draft-full" element={<LandingFull />} />
      {/* Old /kit links (with ?code=) land on the main page. */}
      <Route path="/kit" element={<KitRedirect />} />
      {/* The Raise Kit flow (15 Oct): build your kit, then the kit dashboard after Google sign-in. */}
      <Route path="/build" element={<Build />} />
      <Route path="/app" element={<KitApp />} />
      <Route path="/compare/fundraising-consultant" element={<CompareConsultant />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  );
}

/** /kit?code=X → /?code=X (and /dashboard → /app), so links already shared keep their query. */
function KitRedirect({ to = "/" }: { to?: string }) {
  const { search } = useLocation();
  return <Navigate to={`${to}${search}`} replace />;
}
