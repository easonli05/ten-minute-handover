export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  const { from, error } = await searchParams;

  return (
    <main style={{ maxWidth: 320, margin: "4rem auto", padding: "0 1rem" }}>
      <h1>Ten Minute Handover</h1>
      <form action="/api/login" method="POST">
        {from ? <input type="hidden" name="from" value={from} /> : null}
        <label htmlFor="passcode">Passcode</label>
        <input
          id="passcode"
          name="passcode"
          type="password"
          autoFocus
          required
          style={{ display: "block", width: "100%", margin: "0.5rem 0" }}
        />
        {error ? <p role="alert">Wrong passcode.</p> : null}
        <button type="submit">Enter</button>
      </form>
    </main>
  );
}
