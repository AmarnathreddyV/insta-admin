"use client";

import { useEffect, useState } from "react";

type Metrics = {
  totalCreators: number;
  activeCreators: number;
  connectedInstagram: number;
  totalFollowers: number;
  currentFollowers: number;
};

type Creator = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  country: string | null;
  niche: string | null;
  instagram_username: string | null;
  bio: string | null;
  status: string;
  created_at: string;

  platform_user_id: string | null;
  connected_username: string | null;
  account_type: string | null;
  social_status: string | null;
  connected_at: string | null;
  last_synced: string | null;

  followers: number | null;
  following: number | null;
  media_count: number | null;
  snapshot_date: string | null;
};

type History = {
  snapshot_date: string;
  followers: number;
  following: number;
  media_count: number;
};

type CreatorDetail = Creator & {
  history: History[];
};

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("en-IN").format(Number(value || 0));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [search, setSearch] = useState("");

  const [loadingDashboard, setLoadingDashboard] = useState(false);

  const [selectedCreator, setSelectedCreator] =
    useState<CreatorDetail | null>(null);

  const [loadingCreator, setLoadingCreator] = useState(false);

  const [question, setQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    checkAuthentication();
  }, []);

  async function checkAuthentication() {
    try {
      const response = await fetch("/api/auth/me", {
        cache: "no-store",
      });

      const data = await response.json();

      setAuthenticated(Boolean(data.authenticated));

      if (data.authenticated) {
        loadDashboard();
      }
    } catch {
      setAuthenticated(false);
    }
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();

    setLoginError("");
    setLoggingIn(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setLoginError(data.message || "Login failed.");
        return;
      }

      setPassword("");
      setAuthenticated(true);
      loadDashboard();
    } catch {
      setLoginError("Unable to connect to the server.");
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    setAuthenticated(false);
    setMetrics(null);
    setCreators([]);
    setSelectedCreator(null);
  }

  async function loadDashboard(searchValue = search) {
    setLoadingDashboard(true);

    try {
      const [overviewResponse, creatorsResponse] = await Promise.all([
        fetch("/api/admin/overview", {
          cache: "no-store",
        }),
        fetch(
          `/api/admin/creators?search=${encodeURIComponent(searchValue)}`,
          {
            cache: "no-store",
          }
        ),
      ]);

      if (
        overviewResponse.status === 401 ||
        creatorsResponse.status === 401
      ) {
        setAuthenticated(false);
        return;
      }

      const overviewData = await overviewResponse.json();
      const creatorsData = await creatorsResponse.json();

      if (overviewData.success) {
        setMetrics(overviewData.metrics);
      }

      if (creatorsData.success) {
        setCreators(creatorsData.creators);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingDashboard(false);
    }
  }

  async function openCreator(id: number) {
    setLoadingCreator(true);

    try {
      const response = await fetch(`/api/admin/creators/${id}`, {
        cache: "no-store",
      });

      const data = await response.json();

      if (data.success) {
        setSelectedCreator({
          ...data.creator,
          history: data.history,
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingCreator(false);
    }
  }

  async function askAI(customQuestion?: string) {
    const finalQuestion = customQuestion || question;

    if (!finalQuestion.trim()) {
      return;
    }

    setAiLoading(true);
    setAiAnswer("");

    try {
      const response = await fetch("/api/admin/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: finalQuestion,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAiAnswer(data.message || "AI request failed.");
        return;
      }

      setAiAnswer(data.answer || "No answer returned.");
    } catch {
      setAiAnswer("Unable to connect to the AI service.");
    } finally {
      setAiLoading(false);
    }
  }

  if (authenticated === null) {
    return (
      <main className="loading-screen">
        <div className="loading-card">
          <div className="spinner" />
          <p>Loading admin panel...</p>
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="login-page">
        <div className="login-card">
          <div className="brand-icon">IA</div>

          <h1>Admin Dashboard</h1>

          <p className="login-subtitle">
            Influencer Analytics Platform
          </p>

          <form onSubmit={handleLogin}>
            <label htmlFor="password">Admin Password</label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter admin password"
              autoComplete="current-password"
              required
            />

            {loginError && (
              <div className="error-message">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="primary-button full-width"
              disabled={loggingIn}
            >
              {loggingIn ? "Signing in..." : "Login"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard">
      <header className="topbar">
        <div>
          <div className="brand-name">
            Influencer Analytics
          </div>

          <div className="brand-subtitle">
            Admin Dashboard
          </div>
        </div>

        <button
          className="logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>
      </header>

      <section className="dashboard-content">
        <div className="page-heading">
          <div>
            <h1>Overview</h1>
            <p>
              Monitor creators and Instagram performance.
            </p>
          </div>

          <button
            className="secondary-button"
            onClick={() => loadDashboard()}
          >
            Refresh
          </button>
        </div>

        <section className="metrics-grid">
          <div className="metric-card">
            <span className="metric-label">
              Total Creators
            </span>

            <strong>
              {formatNumber(metrics?.totalCreators)}
            </strong>
          </div>

          <div className="metric-card">
            <span className="metric-label">
              Active Creators
            </span>

            <strong>
              {formatNumber(metrics?.activeCreators)}
            </strong>
          </div>

          <div className="metric-card">
            <span className="metric-label">
              Connected Instagram
            </span>

            <strong>
              {formatNumber(metrics?.connectedInstagram)}
            </strong>
          </div>

          <div className="metric-card">
            <span className="metric-label">
              Total Followers
            </span>

            <strong>
              {formatNumber(metrics?.totalFollowers)}
            </strong>
          </div>
        </section>

        <section className="dashboard-grid">
          <div className="panel creators-panel">
            <div className="panel-header">
              <div>
                <h2>Creators</h2>
                <p>
                  Registered influencer accounts
                </p>
              </div>

              <input
                className="search-input"
                value={search}
                onChange={(event) => {
                  const value = event.target.value;
                  setSearch(value);
                  loadDashboard(value);
                }}
                placeholder="Search creators..."
              />
            </div>

            {loadingDashboard ? (
              <div className="empty-state">
                Loading creators...
              </div>
            ) : creators.length === 0 ? (
              <div className="empty-state">
                No creators found.
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Creator</th>
                      <th>Instagram</th>
                      <th>Niche</th>
                      <th>Followers</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>

                  <tbody>
                    {creators.map((creator) => (
                      <tr key={creator.id}>
                        <td>
                          <div className="creator-name">
                            {creator.name}
                          </div>

                          <div className="creator-email">
                            {creator.email}
                          </div>
                        </td>

                        <td>
                          {creator.connected_username
                            ? `@${creator.connected_username}`
                            : creator.instagram_username
                              ? `@${creator.instagram_username}`
                              : "Not connected"}
                        </td>

                        <td>
                          {creator.niche || "—"}
                        </td>

                        <td>
                          {formatNumber(creator.followers)}
                        </td>

                        <td>
                          <span
                            className={
                              creator.social_status === "active"
                                ? "status connected"
                                : "status pending"
                            }
                          >
                            {creator.social_status === "active"
                              ? "Connected"
                              : "Not connected"}
                          </span>
                        </td>

                        <td>
                          <button
                            className="view-button"
                            onClick={() =>
                              openCreator(creator.id)
                            }
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="panel ai-panel">
            <div className="panel-header">
              <div>
                <h2>AI Analyst</h2>
                <p>
                  Ask questions about your creator data.
                </p>
              </div>
            </div>

            <div className="suggestions">
              <button
                onClick={() =>
                  askAI(
                    "Which creators have shown the strongest follower growth in the available data?"
                  )
                }
              >
                Strongest growth
              </button>

              <button
                onClick={() =>
                  askAI(
                    "Give me a summary of the current creator portfolio."
                  )
                }
              >
                Portfolio summary
              </button>

              <button
                onClick={() =>
                  askAI(
                    "How many creators currently have Instagram connected?"
                  )
                }
              >
                Instagram connections
              </button>
            </div>

            <textarea
              value={question}
              onChange={(event) =>
                setQuestion(event.target.value)
              }
              placeholder="Ask something about your creators..."
              rows={5}
            />

            <button
              className="primary-button"
              onClick={() => askAI()}
              disabled={aiLoading || !question.trim()}
            >
              {aiLoading
                ? "Analyzing..."
                : "Ask AI Analyst"}
            </button>

            {aiAnswer && (
              <div className="ai-answer">
                <div className="ai-answer-title">
                  AI Analyst
                </div>

                <div className="ai-answer-text">
                  {aiAnswer}
                </div>
              </div>
            )}
          </div>
        </section>
      </section>

      {selectedCreator && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedCreator(null)}
        >
          <div
            className="creator-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <h2>
                  {selectedCreator.name}
                </h2>

                <p>
                  Creator ID #{selectedCreator.id}
                </p>
              </div>

              <button
                className="close-button"
                onClick={() =>
                  setSelectedCreator(null)
                }
              >
                ×
              </button>
            </div>

            <div className="detail-grid">
              <div>
                <span>Email</span>
                <strong>
                  {selectedCreator.email}
                </strong>
              </div>

              <div>
                <span>Phone</span>
                <strong>
                  {selectedCreator.phone || "—"}
                </strong>
              </div>

              <div>
                <span>Location</span>
                <strong>
                  {[
                    selectedCreator.city,
                    selectedCreator.country,
                  ]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </strong>
              </div>

              <div>
                <span>Niche</span>
                <strong>
                  {selectedCreator.niche || "—"}
                </strong>
              </div>

              <div>
                <span>Instagram</span>
                <strong>
                  {selectedCreator.connected_username
                    ? `@${selectedCreator.connected_username}`
                    : "Not connected"}
                </strong>
              </div>

              <div>
                <span>Followers</span>
                <strong>
                  {formatNumber(
                    selectedCreator.followers
                  )}
                </strong>
              </div>
            </div>

            <div className="history-section">
              <h3>Follower History</h3>

              {loadingCreator ? (
                <div className="empty-state">
                  Loading...
                </div>
              ) : selectedCreator.history.length === 0 ? (
                <div className="empty-state">
                  No follower history available.
                </div>
              ) : (
                <div className="history-list">
                  {selectedCreator.history.map(
                    (item) => (
                      <div
                        className="history-row"
                        key={item.snapshot_date}
                      >
                        <span>
                          {formatDate(
                            item.snapshot_date
                          )}
                        </span>

                        <strong>
                          {formatNumber(
                            item.followers
                          )}{" "}
                          followers
                        </strong>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {selectedCreator.bio && (
              <div className="bio-section">
                <h3>Bio</h3>
                <p>{selectedCreator.bio}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
