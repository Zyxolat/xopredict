"use client";

import { useEffect, useState } from "react";

export function TOSPopup() {
  const [showTOS, setShowTOS] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [understands18, setUnderstands18] = useState(false);

  useEffect(() => {
    // Check if user has already accepted TOS
    const tosAccepted = localStorage.getItem("xolat_tos_accepted");
    if (!tosAccepted) {
      setShowTOS(true);
    }
  }, []);

  const handleAccept = () => {
    if (!accepted || !understands18) {
      alert("Please accept all terms");
      return;
    }

    localStorage.setItem("xolat_tos_accepted", "true");
    localStorage.setItem("xolat_tos_timestamp", new Date().toISOString());
    setShowTOS(false);
  };

  if (!showTOS) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-4">
            ⚠️ Terms & Compliance
          </h2>

          <div className="space-y-4 mb-6 text-slate-300 text-sm">
            <section>
              <h3 className="font-semibold text-white mb-2">🔞 Age Requirement</h3>
              <p>
                By using XOLAT, you confirm that you are at least 18 years old and
                legally permitted to participate in games of chance in your jurisdiction.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-white mb-2">📋 Terms of Service</h3>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>No automated bots or scripts</li>
                <li>One account per person (multi-accounting = ban)</li>
                <li>No deposit/withdrawal during cooldown</li>
                <li>Games are final once submitted</li>
                <li>Admin reserves right to cancel bets in case of abuse</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-white mb-2">🌍 Geographic Restrictions</h3>
              <p>
                This game is not available to users in the United States or
                restricted jurisdictions. Verify your location with VPN usage at your
                own risk.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-white mb-2">⚙️ Provably Fair</h3>
              <p>
                All games use verifiable on-chain randomness. Visit /verify to
                independently confirm any round&apos;s fairness.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-white mb-2">💰 Responsible Gaming</h3>
              <p>
                Set limits: Max 100 USDm/day, max 20 USDm per bet. Cooldown applies
                after 5 losses. Never bet money you cannot afford to lose.
              </p>
            </section>
          </div>

          {/* Checkboxes */}
          <div className="space-y-3 mb-6 border-t border-slate-700 pt-4">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={understands18}
                onChange={(e) => setUnderstands18(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-700 border-slate-600"
              />
              <span className="text-sm text-slate-300">
                I confirm I am 18+ and legally allowed to play
              </span>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-700 border-slate-600"
              />
              <span className="text-sm text-slate-300">
                I accept the Terms of Service and Responsible Gaming guidelines
              </span>
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                localStorage.setItem("xolat_tos_rejected", "true");
                setShowTOS(false);
              }}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition"
            >
              Decline
            </button>
            <button
              onClick={handleAccept}
              disabled={!accepted || !understands18}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 disabled:opacity-50 text-white rounded-lg font-semibold transition"
            >
              I Agree & Enter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
