// Placeholder until the landing page milestone. Confirms the app runs with the v4 tokens.
export default function App() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16, textAlign: 'center' }}>
      <div>
        <p style={{ font: '500 12px var(--mono)', letterSpacing: '.12em', color: 'var(--muted)' }}>SETUP CHECK</p>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 40, letterSpacing: '-.03em', margin: '8px 0' }}>
          Fundraising OS is <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: '#CFDCFF' }}>running.</span>
        </h1>
        <p style={{ color: 'var(--fg2)' }}>Next: the landing page.</p>
      </div>
    </main>
  )
}
