import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="flow"><div className="flow-main"><div className="step center">
      <h1>This page doesn't exist.</h1>
      <p className="help">The link may be old or mistyped.</p>
      <div className="cta-row" style={{ justifyContent: "center" }}><Link className="btn primary" to="/">Go to the home page</Link></div>
    </div></div></main>
  );
}
