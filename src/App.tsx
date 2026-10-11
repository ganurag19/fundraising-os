import { Route, Routes } from "react-router-dom";
import Landing from "./landing/Landing";
import Start from "./pages/Start";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/start" element={<Start />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
