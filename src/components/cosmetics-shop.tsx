"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

interface CosmeticItem {
  type: string;
  name: string;
  displayName: string;
  price: number;
}

interface CosmeticOwned {
  id: string;
  playerAddress: string;
  type: string;
  name: string;
  purchasedAt: string;
}

export function CosmeticsShop() {
  const { address } = useAccount();
  const [shop, setShop] = useState<CosmeticItem[]>([]);
  const [owned, setOwned] = useState<CosmeticOwned[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;

    const fetchShop = async () => {
      try {
        const res = await fetch(`/api/cosmetics?address=${address}`);
        const data = await res.json();
        setShop(data.data.shop);
        setOwned(data.data.owned);
      } catch (error) {
        console.error("Failed to fetch cosmetics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchShop();
  }, [address]);

  const handlePurchase = async (item: CosmeticItem) => {
    if (!address) return;

    setPurchasing(`${item.type}_${item.name}`);
    try {
      const res = await fetch("/api/cosmetics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          type: item.type,
          name: item.name,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setOwned([...owned, data.data.cosmetic]);
        alert(`Purchased ${item.displayName}!`);
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Failed to purchase:", error);
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return <div className="text-slate-400 text-sm">Loading shop...</div>;
  }

  const isOwned = (type: string, name: string) => {
    return owned.some((o) => o.type === type && o.name === name);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white mb-4">
        🛍️ Cosmetics Shop
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {shop.map((item) => (
          <div
            key={`${item.type}_${item.name}`}
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-purple-500/50 transition"
          >
            <div className="mb-3">
              <h4 className="font-semibold text-white text-sm">
                {item.displayName}
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                {item.type === "card_back"
                  ? "💳 Card Back"
                  : item.type === "flip_fx"
                    ? "✨ Flip Effect"
                    : "🖼️ Frame"}
              </p>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-green-400 font-bold">
                {item.price} USDm
              </span>
              <button
                onClick={() => handlePurchase(item)}
                disabled={isOwned(item.type, item.name) || purchasing === `${item.type}_${item.name}`}
                className={`px-3 py-1 rounded text-xs font-semibold transition ${
                  isOwned(item.type, item.name)
                    ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                    : "bg-purple-600 hover:bg-purple-700 text-white"
                }`}
              >
                {isOwned(item.type, item.name)
                  ? "Owned"
                  : purchasing === `${item.type}_${item.name}`
                    ? "..."
                    : "Buy"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
