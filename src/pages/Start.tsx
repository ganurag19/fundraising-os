import { Link } from "react-router-dom";

// Sign-up starts in milestone 1. Until then this page confirms the invite code worked.
export default function Start() {
  const code = sessionStorage.getItem("inviteCode");
  return (
    <main className="flow">
      <div className="flow-top"><Link className="logo" to="/"><span className="logo-mark">F</span>Fundraising OS</Link><Link className="btn ghost sm" to="/">Exit</Link></div>
      <div className="flow-main">
        <div className="step center">
          <span className="tag gold">{code ? `Invite code ${code} accepted` : "Invite needed"}</span>
          <h1 style={{ marginTop: 16 }}>Your 10 minutes start here. <span className="it">Very soon.</span></h1>
          <p className="help">The 4-step sign-up is being built now (milestone 1). Your code is saved on this device.</p>
          <Link className="btn ghost" to="/">← Back to the home page</Link>
        </div>
      </div>
    </main>
  );
}
