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
      <Route path="/compare/fundraising-consultant" element={<CompareConsultant />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  );
}
