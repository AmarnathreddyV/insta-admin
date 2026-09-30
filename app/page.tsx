"use client";

import { useEffect, useMemo, useState } from "react";

type Creator = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  country: string | null;
  niche: string | null;
  instagram_username: string | null;
  connected_username: string | null;
  status: string;
  instagram_connected: boolean;
  followers: number;
  following: number;
  media_count: number;
  snapshot_date: string | null;
  created_at: string;
};

type Snapshot = {
  snapshot_date: string;
  followers: number;
  following: number;
  media_count: number;
};

type Detail = {
  creator: Creator & {
    platform_user_id?: string;
    account_type?: string;
    social_status?: string;
    connected_at?: string;
    last_synced?: string;
  };
  snapshots: Snapshot[];
};

function formatNumber(value: number | string) {
  return new Intl.NumberFormat("en-IN").format(Number(value || 0));
}

function Login({ onLogin }: { onLogin: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Login failed.");
      }

      onLogin(data.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="logo-mark">IA</div>
        <div className="eyebrow">INFLUENCER ANALYTICS</div>
        <h1>Admin Dashboard</h1>
        <p>Sign in to manage creators and analyze Instagram performance.</p>

        <form onSubmit={submit}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            required
          />

          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          {error && <div className="login-error">{error}</div>}

          <button className="login-button" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function CreatorDetail({
  detail,
  onClose,
}: {
  detail: Detail;
  onClose: () => void;
}) {
  const snapshots = detail.snapshots;
  const latest = snapshots[snapshots.length - 1];
  const previous = snapshots[snapshots.length - 2];
  const change = latest && previous
    ? latest.followers - previous.followers
    : 0;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="detail-modal" onMouseDown={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        <div className="detail-header">
          <div className="avatar large">
            {(detail.creator.name || "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="eyebrow">CREATOR PROFILE</div>
            <h2>{detail.creator.name}</h2>
            <p>
              @{detail.creator.connected_username || detail.creator.instagram_username || "not connected"}
            </p>
          </div>
        </div>

        <div className="detail-metrics">
          <MetricCard
            label="Followers"
            value={formatNumber(latest?.followers || detail.creator.followers)}
            detail={`${change >= 0 ? "+" : ""}${formatNumber(change)} since previous snapshot`}
          />
          <MetricCard
            label="Following"
            value={formatNumber(latest?.following || detail.creator.following)}
            detail="Latest snapshot"
          />
          <MetricCard
            label="Media"
            value={formatNumber(latest?.media_count || detail.creator.media_count)}
            detail="Published media"
          />
        </div>

        <div className="detail-grid">
          <div className="detail-box">
            <h3>Profile</h3>
            <p><b>Email:</b> {detail.creator.email}</p>
            <p><b>Location:</b> {detail.creator.city || "—"}, {detail.creator.country || "—"}</p>
            <p><b>Niche:</b> {detail.creator.niche || "—"}</p>
            <p><b>Status:</b> {detail.creator.status}</p>
          </div>

          <div className="detail-box">
            <h3>Instagram</h3>
            <p><b>Username:</b> @{detail.creator.connected_username || detail.creator.instagram_username || "—"}</p>
            <p><b>Connection:</b> {detail.creator.instagram_connected ? "Connected" : "Not connected"}</p>
            <p><b>Last sync:</b> {detail.creator.last_synced ? new Date(detail.creator.last_synced).toLocaleString() : "—"}</p>
          </div>
        </div>

        <div className="chart-box">
          <div className="section-title">
            <div>
              <h3>Follower history</h3>
              <span>{snapshots.length} snapshots</span>
            </div>
          </div>

          {snapshots.length ? (
            <div className="bar-chart">
              {snapshots.slice(-30).map((item, index, arr) => {
                const max = Math.max(...arr.map((x) => Number(x.followers)), 1);
                const height = Math.max(8, (Number(item.followers) / max) * 100);
                return (
                  <div className="bar-wrap" key={item.snapshot_date}>
                    <div
                      className="bar"
                      style={{ height: `${height}%` }}
                      title={`${item.snapshot_date}: ${formatNumber(item.followers)}`}
                    />
                    {index % Math.max(1, Math.floor(arr.length / 6)) === 0 && (
                      <span>{item.snapshot_date.slice(5)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">No follower snapshots yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function AIAnalyst() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const suggestions = [
    "Which creator has the most followers?",
    "Which creators have the strongest recent growth?",
    "Give me a summary of the current creator portfolio.",
    "Which creators are not connected to Instagram?",
  ];

  async function ask(text = question) {
    if (!text.trim()) return;
    setLoading(true);
    setAnswer("");

    try {
      const response = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "AI request failed.");
      }

      setAnswer(data.answer);
    } catch (err) {
      setAnswer(err instanceof Error ? err.message : "AI request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="ai-panel">
      <div className="ai-heading">
        <div className="ai-icon">✦</div>
        <div>
          <div className="eyebrow">AI ANALYST</div>
          <h2>Ask about your creator data</h2>
          <p>The assistant reads the current analytics data before answering.</p>
        </div>
      </div>

      <div className="suggestions">
        {suggestions.map((item) => (
          <button key={item} onClick={() => ask(item)} disabled={loading}>
            {item}
          </button>
        ))}
      </div>

      <div className="ai-input-row">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask something like: Which creator gained the most followers?"
          rows={3}
        />
        <button className="ask-button" onClick={() => ask()} disabled={loading || !question.trim()}>
          {loading ? "Analyzing..." : "Ask AI"}
        </button>
      </div>

      {answer && (
        <div className="ai-answer">
          <div className="answer-label">ANALYST RESPONSE</div>
          <div className="answer-text">{answer}</div>
        </div>
      )}
    </section>
  );
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [creators, setCreators] = useState<Creator[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "creators" | "ai">("overview");

  async function checkAuth() {
    const response = await fetch("/api/auth/me");
    if (!response.ok) {
      setAuthenticated(false);
      return;
    }
    const data = await response.json();
    setAuthenticated(Boolean(data.authenticated));
    setEmail(data.email || "");
  }

  async function loadData() {
    setLoading(true);
    try {
      const [overviewResponse, creatorsResponse] = await Promise.all([
        fetch("/api/admin/overview"),
        fetch(`/api/admin/creators?search=${encodeURIComponent(search)}`),
      ]);

      if (overviewResponse.status === 401 || creatorsResponse.status === 401) {
        setAuthenticated(false);
        return;
      }

      const overview = await overviewResponse.json();
      const creatorData = await creatorsResponse.json();

      if (overview.success) setStats(overview.stats);
      if (creatorData.success) setCreators(creatorData.creators);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (authenticated) loadData();
  }, [authenticated, search]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthenticated(false);
  }

  async function openCreator(id: number) {
    const response = await fetch(`/api/admin/creators/${id}`);
    const data = await response.json();
    if (data.success) setSelected(data);
  }

  const connectedPercent = useMemo(() => {
    if (!stats?.total_creators) return 0;
    return Math.round((Number(stats.connected_instagram) / Number(stats.total_creators)) * 100);
  }, [stats]);

  if (authenticated === null) {
    return <div className="loading-page">Loading dashboard...</div>;
  }

  if (!authenticated) {
    return <Login onLogin={(value) => { setEmail(value); setAuthenticated(true); }} />;
  }

  return (
    <main className="dashboard-page">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="logo-mark">IA</div>
          <div>
            <strong>Influencer</strong>
            <span>Analytics</span>
          </div>
        </div>

        <nav>
          <button className={activeTab === "overview" ? "active" : ""} onClick={() => setActiveTab("overview")}>
            <span>⌂</span> Overview
          </button>
          <button className={activeTab === "creators" ? "active" : ""} onClick={() => setActiveTab("creators")}>
            <span>◉</span> Creators
          </button>
          <button className={activeTab === "ai" ? "active" : ""} onClick={() => setActiveTab("ai")}>
            <span>✦</span> AI Analyst
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="admin-user">
            <div className="avatar">{email.charAt(0).toUpperCase()}</div>
            <div>
              <strong>Administrator</strong>
              <span>{email}</span>
            </div>
          </div>
          <button className="logout-button" onClick={logout}>Sign out</button>
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="topbar">
          <div>
            <div className="eyebrow">ADMIN CONSOLE</div>
            <h1>
              {activeTab === "overview"
                ? "Dashboard overview"
                : activeTab === "creators"
                ? "Creator management"
                : "AI Analyst"}
            </h1>
          </div>
          <button className="refresh-button" onClick={loadData}>
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </header>

        {activeTab === "overview" && (
          <>
            <div className="metrics-grid">
              <MetricCard
                label="Total creators"
                value={formatNumber(stats?.total_creators || 0)}
                detail={`${formatNumber(stats?.active_creators || 0)} active`}
              />
              <MetricCard
                label="Instagram connected"
                value={formatNumber(stats?.connected_instagram || 0)}
                detail={`${connectedPercent}% of creators`}
              />
              <MetricCard
                label="Total followers"
                value={formatNumber(stats?.total_followers || 0)}
                detail="Latest snapshots"
              />
              <MetricCard
                label="Recent follower change"
                value={`${Number(stats?.follower_change || 0) >= 0 ? "+" : ""}${formatNumber(stats?.follower_change || 0)}`}
                detail="Latest vs previous snapshot"
              />
            </div>

            <div className="content-grid">
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <div className="eyebrow">CREATOR PORTFOLIO</div>
                    <h2>Recent creators</h2>
                  </div>
                  <button onClick={() => setActiveTab("creators")}>View all →</button>
                </div>

                <div className="creator-list">
                  {creators.slice(0, 6).map((creator) => (
                    <button className="creator-row" key={creator.id} onClick={() => openCreator(creator.id)}>
                      <div className="avatar">{creator.name.charAt(0).toUpperCase()}</div>
                      <div className="creator-main">
                        <strong>{creator.name}</strong>
                        <span>@{creator.connected_username || creator.instagram_username || "not connected"}</span>
                      </div>
                      <div className="creator-followers">
                        <strong>{formatNumber(creator.followers)}</strong>
                        <span>followers</span>
                      </div>
                      <span className={`status ${creator.instagram_connected ? "connected" : "pending"}`}>
                        {creator.instagram_connected ? "Connected" : "Pending"}
                      </span>
                    </button>
                  ))}
                  {!creators.length && <div className="empty-state">No creators registered yet.</div>}
                </div>
              </section>

              <section className="panel insight-panel">
                <div className="eyebrow">QUICK INSIGHT</div>
                <h2>Portfolio status</h2>
                <p>
                  {creators.length
                    ? `${connectedPercent}% of registered creators currently have an active Instagram connection.`
                    : "Register your first creator to start collecting analytics."}
                </p>
                <div className="progress-wide">
                  <div style={{ width: `${connectedPercent}%` }} />
                </div>
                <div className="insight-stats">
                  <span>{formatNumber(stats?.connected_instagram || 0)} connected</span>
                  <span>{formatNumber(Math.max(0, Number(stats?.total_creators || 0) - Number(stats?.connected_instagram || 0)))} pending</span>
                </div>
              </section>
            </div>
          </>
        )}

        {activeTab === "creators" && (
          <section className="panel">
            <div className="creator-toolbar">
              <div>
                <div className="eyebrow">CREATORS</div>
                <h2>All creators</h2>
              </div>
              <input
                className="search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, username..."
              />
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Creator</th>
                    <th>Instagram</th>
                    <th>Followers</th>
                    <th>Media</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {creators.map((creator) => (
                    <tr key={creator.id}>
                      <td>
                        <button className="table-person" onClick={() => openCreator(creator.id)}>
                          <div className="avatar small">{creator.name.charAt(0).toUpperCase()}</div>
                          <span>
                            <strong>{creator.name}</strong>
                            <small>{creator.email}</small>
                          </span>
                        </button>
                      </td>
                      <td>@{creator.connected_username || creator.instagram_username || "—"}</td>
                      <td>{formatNumber(creator.followers)}</td>
                      <td>{formatNumber(creator.media_count)}</td>
                      <td>
                        <span className={`status ${creator.instagram_connected ? "connected" : "pending"}`}>
                          {creator.instagram_connected ? "Connected" : "Pending"}
                        </span>
                      </td>
                      <td>
                        <button className="view-button" onClick={() => openCreator(creator.id)}>View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!creators.length && <div className="empty-state">No matching creators.</div>}
            </div>
          </section>
        )}

        {activeTab === "ai" && <AIAnalyst />}
      </section>

      {selected && (
        <CreatorDetail detail={selected} onClose={() => setSelected(null)} />
      )}
    </main>
  );
}
