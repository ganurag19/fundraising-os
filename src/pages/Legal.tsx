import { Link } from "react-router-dom";
import { LogoMark, Wordmark } from "../components/Brand";

// Privacy Policy and Terms. Plain words, matching what the app actually stores (convex/schema.ts).
// Draft written for the beta; have a lawyer review before paid ads or payments.

const UPDATED = "16 October 2026";
const CONTACT = "hello@firstcheq.ai";

function Doc({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="app-wrap legal">
      <div className="app-top"><Link className="logo" to="/"><LogoMark /><Wordmark /></Link><Link className="btn ghost sm" to="/">Home</Link></div>
      <h1>{title}</h1>
      <p className="muted small">Last updated {UPDATED}</p>
      {children}
      <p className="muted small" style={{ marginTop: 40 }}>Questions: <a href={`mailto:${CONTACT}`}>{CONTACT}</a> · <Link to="/privacy">Privacy</Link> · <Link to="/terms">Terms</Link></p>
    </main>
  );
}

export function Privacy() {
  return (
    <Doc title="Privacy Policy">
      <p>FirstCheq helps first-time founders in India find investors who fit and write their first emails to them. This page says what we collect, why, and what you can ask us to do with it. FirstCheq is run by Anurag, its founder, from India.</p>

      <h2>What we collect from founders</h2>
      <ul>
        <li><b>Your sign-up answers:</b> your startup's name, your name, sector, stage, how much you're raising, your website and LinkedIn link, your one-liner, a line about you, your vision, and any revenue or customer numbers you choose to give.</li>
        <li><b>For your Raise Kit:</b> the facts you confirm (problem, product, customers, team, market, business model, competitors, use of funds) and your brand (main colour, logo link and font from your website).</li>
        <li><b>Files you upload</b> (an old deck, your CV, your LinkedIn profile as a PDF): read once to suggest your facts, then deleted straight away. We keep only the facts you confirm, never the file.</li>
        <li><b>What we make for you:</b> your matched investors, the emails we draft, your deck and teaser text, any edits, and whether you marked an email as sent.</li>
        <li><b>Your pitch room:</b> if you share your room's link, people who ask for access give their name, email and firm; you see them and decide. Once you approve someone, we count their views, the slides they read and whether they ask to meet, and show that only to you.</li>
        <li><b>If you request full access:</b> the plan you picked, your answers (would you pay, your ratings, what you liked and what's missing, when you're raising) and your phone number if you give it.</li>
        <li><b>When you sign in with Google:</b> your name, email address and profile picture link, from Google.</li>
        <li><b>A random code in your browser</b> that keeps your list yours before you sign in. It isn't used to track you anywhere else.</li>
        <li><b>If you ask for an invite:</b> your name, email, startup's name and stage.</li>
        <li><b>If you send feedback:</b> your note, the page you sent it from, and your email if you give it (or your sign-in email).</li>
        <li><b>Usage counts:</b> which pages were opened, which buttons were pressed and which steps were reached, and when, so we can see where people get stuck. These are linked to a scrambled form of the random code in your browser, never to your name or email, and never include what you type.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To match you with investors and draft your emails. That is the whole product.</li>
        <li>To read your website once, when you give it, to suggest your one-liner, your facts and your brand colours.</li>
        <li>To write your deck and teaser from the facts you confirmed. Every number in them is one you gave us.</li>
        <li>To improve the quality of drafts. We keep a log of what went into and came out of each AI draft and review it to fix mistakes.</li>
        <li>To contact you about your account or your invite. No marketing emails without your consent.</li>
      </ul>
      <p><b>We never send emails for you.</b> Every email leaves from your own email account, only when you press send. <b>We don't sell your data</b>, and we don't share your startup's details with investors.</p>

      <h2>Who processes it for us</h2>
      <ul>
        <li><b>Convex</b> stores the data and runs the app. Its servers for FirstCheq are in Australia, so your data is stored outside India.</li>
        <li><b>Anthropic</b> (Claude) drafts the text. We send it only what a draft needs: your sign-up answers, your confirmed facts, any file you upload (to read it once) and the investor's researched details. We use Anthropic's commercial API.</li>
        <li><b>Google</b> handles sign-in, if you choose it.</li>
        <li><b>Resend</b> delivers our emails to you (your welcome and follow-up reminders). It gets your email address and that message only. You can turn reminders off in Settings.</li>
      </ul>

      <h2>Information about investors</h2>
      <p>Investor details (name, firm, published email, sectors, stages, cheque sizes, portfolio, stated thesis) are researched from public sources such as fund websites and press. If you are an investor and want your details corrected or removed, write to <a href={`mailto:${CONTACT}`}>{CONTACT}</a> and we'll act within 7 days.</p>

      <h2>How long we keep it, and your choices</h2>
      <p>We keep your data while your account is active. You can ask us to see, correct or delete your data at any time by writing to <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. We delete it within 30 days, except where the law asks us to keep something. You can withdraw consent at any time; the service may then stop working for you.</p>

      <h2>Grievances</h2>
      <p>Under India's Digital Personal Data Protection Act, 2023, you can raise a grievance with us. Contact: Anurag, Founder, <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. We reply within 7 days.</p>

      <h2>Changes</h2>
      <p>If we change this policy in a way that matters, we'll tell you in the app before it applies.</p>
    </Doc>
  );
}

export function Terms() {
  return (
    <Doc title="Terms of Service">
      <p>These terms apply when you use FirstCheq. By using it, you agree to them. FirstCheq is in an invite-only beta and is free while in beta.</p>

      <h2>What FirstCheq does, and doesn't</h2>
      <ul>
        <li>It suggests investors who may fit your startup and drafts emails for you to edit and send yourself.</li>
        <li><b>It is not investment advice, and we are not a broker, investment adviser or fundraising platform.</b> We don't offer securities, hold money, or take part in any deal.</li>
        <li><b>No promised outcome.</b> We can't promise replies, meetings or funding.</li>
        <li>Investor information comes from public sources and can be out of date or wrong. Check anything important before you rely on it.</li>
        <li>Drafts are written with AI and can contain mistakes. Read every email before you send it; what you send is your responsibility.</li>
      </ul>

      <h2>Your part</h2>
      <ul>
        <li>Give true information about yourself and your startup.</li>
        <li>Use investor contacts only to write to them about your own startup. Don't bulk-email, resell, publish or scrape the investor list.</li>
        <li>Don't misuse the service: no attempts to break it, overload it, or get around limits or invite codes.</li>
        <li>Keep your invite code and account to yourself unless we say the code is shareable.</li>
      </ul>

      <h2>Your content</h2>
      <p>What you enter and the emails drafted for you are yours. You let us store and process them to run the service and improve drafts, as our Privacy Policy describes.</p>

      <h2>Changes, suspension and liability</h2>
      <ul>
        <li>The beta may change, pause or end. If we start charging, we'll tell you the price before you pay anything.</li>
        <li>We may suspend accounts that break these terms.</li>
        <li>The service is provided as is. As far as the law allows, we aren't liable for indirect losses, or for decisions you or investors make. Our total liability is limited to what you paid us in the last 12 months.</li>
      </ul>

      <h2>Law</h2>
      <p>These terms are governed by the laws of India. Write to <a href={`mailto:${CONTACT}`}>{CONTACT}</a> with any question or complaint.</p>
    </Doc>
  );
}
