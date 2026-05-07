import { AuthButton } from "@/components/AuthButton";

export default function LoginPage() {
  return (
    <div className="login-page">
      <section className="login-panel panel panel-pad">
        <div className="brand" style={{ marginBottom: 18 }}>
          <span className="brand-mark">CL</span>
          <span>Cube Ledger</span>
        </div>
        <h1>Sign in to view Cube Ledger</h1>
        <p className="muted">Draft history, player stats, money results, and editing tools are private to the playgroup.</p>
        <AuthButton />
      </section>
    </div>
  );
}
