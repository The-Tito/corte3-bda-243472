"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export function SessionDebugger() {
  const pathname = usePathname();
  const [session, setSession] = useState<{
    role: string | null;
    vetId: string | null;
  }>({
    role: null,
    vetId: null,
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateSession = () => {
      setSession({
        role: localStorage.getItem("role"),
        vetId: localStorage.getItem("vet_id"),
      });
    };

    updateSession();
    // Listen for storage changes (for multiple tabs, though not common in this demo)
    window.addEventListener("storage", updateSession);

    // Check every 2 seconds as a fallback since next/navigation doesn't trigger storage event
    const interval = setInterval(updateSession, 2000);

    return () => {
      window.removeEventListener("storage", updateSession);
      clearInterval(interval);
    };
  }, [pathname]);

  if (!session.role || pathname === "/login") return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 9999,
        fontFamily: "monospace",
      }}
    >
      <div
        onClick={() => setIsVisible(!isVisible)}
        style={{
          background: "#1e293b",
          color: "#38bdf8",
          padding: "8px 16px",
          borderRadius: "999px",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "0.75rem",
          fontWeight: 800,
          border: "1px solid #334155",
        }}
      >
        <span style={{ animation: "pulse 2s infinite" }}>●</span>
        DATABASE SESSION CONTEXT
      </div>

      {isVisible && (
        <div
          style={{
            position: "absolute",
            bottom: "50px",
            right: "0",
            width: "280px",
            background: "#0f172a",
            border: "1px solid #334155",
            borderRadius: "12px",
            padding: "16px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
            color: "#e2e8f0",
          }}
        >
          <h4
            style={{
              margin: "0 0 12px",
              fontSize: "0.85rem",
              color: "#94a3b8",
              borderBottom: "1px solid #1e293b",
              paddingBottom: "8px",
            }}
          >
            PostgreSQL Session Params
          </h4>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ fontSize: "0.7rem" }}>
              <span style={{ color: "#38bdf8" }}>SET LOCAL ROLE</span>
              <div
                style={{
                  background: "#1e293b",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  marginTop: "4px",
                  color: "#fff",
                }}
              >
                {session.role}
              </div>
            </div>

            <div style={{ fontSize: "0.7rem" }}>
              <span style={{ color: "#38bdf8" }}>app.current_vet_id</span>
              <div
                style={{
                  background: "#1e293b",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  marginTop: "4px",
                  color: "#fff",
                }}
              >
                {session.vetId || "NULL"}
              </div>
            </div>

            <div
              style={{
                fontSize: "0.7rem",
                marginTop: "4px",
                color: "#64748b",
                fontStyle: "italic",
              }}
            >
              * Estos valores se inyectan en cada transacción para que RLS
              funcione.
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
