import { Route, Routes } from "react-router-dom";
import Landing from "./landing/Landing";
import Start from "./pages/Start";
import Emails from "./pages/Emails";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import { Privacy, Terms } from "./pages/Legal";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/start" element={<Start />} />
      <Route path="/emails" element={<Emails />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
