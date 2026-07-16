"use client";

import { useState } from "react";
import html2canvas from "html2canvas";

interface ShareData {
  text: string;
  winner: string;
  amount: string;
  roundId: string;
  timestamp: string;
  shareUrls: {
    twitter: string;
    farcaster: string;
    telegram: string;
  };
  imageData?: {
    width: number;
    height: number;
    backgroundColor: string;
    text: string;
  };
}

interface ShareWinProps {
  amount: number;
  roundId: string;
}

export function ShareWin({ amount, roundId }: ShareWinProps) {
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchShareData = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/share-win?roundId=${roundId}&format=png-data`
      );
      const data = await res.json();
      setShareData(data.data);
    } catch (error) {
      console.error("Failed to fetch share data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generatePNG = async () => {
    if (!shareData) {
      await fetchShareData();
      return;
    }

    const element = document.getElementById("share-card");
    if (!element) return;

    try {
      const canvas = await html2canvas(element);
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `xolat-win-${amount}.png`;
      link.click();
    } catch (error) {
      console.error("Failed to generate PNG:", error);
    }
  };

  const shareToSocial = (platform: "twitter" | "farcaster" | "telegram") => {
    if (!shareData) return;
    const url = shareData.shareUrls[platform];
    if (platform === "farcaster") {
      // Copy to clipboard for Farcaster
      navigator.clipboard.writeText(shareData.text);
      alert("Share text copied to clipboard!");
    } else {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={fetchShareData}
        disabled={loading}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Loading..." : "Share Win"}
      </button>

      {shareData && (
        <div className="space-y-4">
          {/* Share Card for PNG generation */}
          <div
            id="share-card"
            className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-xl text-center w-full"
            style={{
              backgroundImage:
                "linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(236, 72, 153, 0.1))",
            }}
          >
            <div className="text-4xl mb-4">⚡</div>
            <h2 className="text-3xl font-bold text-white mb-2">
              I won {amount.toFixed(2)} USDm
            </h2>
            <p className="text-purple-400 mb-4">on XOLAT</p>
            <p className="text-slate-400">Play now at xolat.game</p>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={generatePNG}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm"
            >
              Download PNG
            </button>
            <button
              onClick={() => shareToSocial("twitter")}
              className="bg-sky-500 hover:bg-sky-600 text-white px-3 py-2 rounded-lg text-sm"
            >
              Twitter
            </button>
            <button
              onClick={() => shareToSocial("farcaster")}
              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm"
            >
              Farcaster
            </button>
            <button
              onClick={() => shareToSocial("telegram")}
              className="bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-2 rounded-lg text-sm"
            >
              Telegram
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
