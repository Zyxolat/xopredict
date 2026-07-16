"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useAccount, useSignMessage } from "wagmi";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { ConnectButton } from "@/components/connect-button";

export default function LoginPage() {
  const { data: session } = useSession();
  const { address, isConnected } = useAccount();
  const { signMessage } = useSignMessage();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isHydratedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [walletAuthInProgress, setWalletAuthInProgress] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [showFAQ, setShowFAQ] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (session?.user) {
      router.push("/");
    }
  }, [session, router]);

  // Load preferences from localStorage on mount (client-side only)
  useEffect(() => {
    // This effect runs after hydration
    isHydratedRef.current = true;
    
    try {
      const savedRememberMe = localStorage.getItem("xolat_rememberMe") === "true";
      const savedAcceptTerms = localStorage.getItem("xolat_acceptTerms") === "true";
      const savedEmail = localStorage.getItem("xolat_email") || "";
      
      if (savedRememberMe || savedAcceptTerms || savedEmail) {
        setRememberMe(savedRememberMe);
        setAcceptTerms(savedAcceptTerms);
        setEmail(savedEmail);
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    }
  }, []);

  // Save preferences to localStorage when they change (only after hydration)
  useEffect(() => {
    if (!isHydratedRef.current) return;
    
    try {
      localStorage.setItem("xolat_rememberMe", rememberMe.toString());
      localStorage.setItem("xolat_acceptTerms", acceptTerms.toString());
      localStorage.setItem("xolat_email", email);
    } catch (error) {
      console.error("Error saving preferences:", error);
    }
  }, [rememberMe, acceptTerms, email]);

  // Handle Email Login
  const handleEmailLogin = async () => {
    if (!email) {
      alert("Please enter your email address");
      return;
    }
    
    if (!acceptTerms) {
      alert("Please agree to the terms and conditions");
      return;
    }

    setIsLoading(true);
    try {
      const result = await signIn("email", {
        email,
        redirect: false,
      });

      if (result?.error) {
        alert(`Email login error: ${result.error}`);
      } else if (result?.ok) {
        alert("Check your email for the sign-in link!");
      }
    } catch (error) {
      console.error("Email login error:", error);
      alert("Email login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize WebGL shader
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Sync canvas size
    function syncSize() {
      if (!canvas) return;
      const w = canvas.clientWidth || 1280;
      const h = canvas.clientHeight || 720;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }

    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(syncSize).observe(canvas);
    }
    syncSize();

    const gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return;

    const vs = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

    const fs = `precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

varying vec2 v_texCoord;

void main() {
    vec2 uv = v_texCoord;
    vec2 p = (uv * 2.0 - 1.0);
    p.x *= u_resolution.x / u_resolution.y;

    float t = u_time * 0.5;
    
    // Liquid noise effect
    for(float i = 1.0; i < 4.0; i++) {
        p.x += 0.3 / i * sin(i * 3.0 * p.y + t);
        p.y += 0.3 / i * cos(i * 3.0 * p.x + t);
    }

    // Neon purple colors
    vec3 color1 = vec3(0.86, 0.72, 1.0); // Primary purple #ddb7ff
    vec3 color2 = vec3(0.04, 0.07, 0.15); // Deep surface #0b1326
    
    float mask = 0.5 + 0.5 * sin(p.x + p.y + t);
    vec3 color = mix(color2, color1 * 0.15, mask);
    
    // Add some "glow" lines
    float line = abs(0.01 / (sin(p.x + p.y + t) * 0.5));
    color += color1 * line * 0.2;

    gl_FragColor = vec4(color, 1.0);
}`;

    const cs = (type: number, src: string): WebGLShader | null => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const prog = gl.createProgram();
    if (!prog) return;
    
    const vertShader = cs(gl.VERTEX_SHADER, vs);
    const fragShader = cs(gl.FRAGMENT_SHADER, fs);
    if (!vertShader || !fragShader) return;
    
    gl.attachShader(prog, vertShader);
    gl.attachShader(prog, fragShader);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "u_time");
    const uRes = gl.getUniformLocation(prog, "u_resolution");
    const uMouse = gl.getUniformLocation(prog, "u_mouse");

    const mouse = { x: canvas.width / 2, y: canvas.height / 2 };
    window.addEventListener("mousemove", (event) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width && rect.height) {
        const nx = (event.clientX - rect.left) / rect.width;
        const ny = 1.0 - (event.clientY - rect.top) / rect.height;
        mouse.x = nx * canvas.width;
        mouse.y = ny * canvas.height;
      }
    });

    const render = (t: number) => {
      if (typeof ResizeObserver === "undefined") syncSize();
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, t * 0.001);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      if (uMouse) gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(render);
    };
    render(0);
  }, []);

  // Handle wallet signing after connection
  useEffect(() => {
    const handleWalletSignIn = async () => {
      if (!isConnected || !address || walletAuthInProgress) return;

      setWalletAuthInProgress(true);
      setWalletError(null);
      try {
        const message = `Sign in to XOLAT\n\nWallet: ${address}\nTimestamp: ${new Date().toISOString()}`;

        const signature = await new Promise<string>((resolve, reject) => {
          signMessage(
            { message },
            {
              onSuccess: (sig) => resolve(sig),
              onError: (err) => reject(err),
            }
          );
        });

        const result = await signIn("credentials", {
          address,
          message,
          signature,
          redirect: false,
        });

        if (result?.ok) {
          router.push("/");
        } else {
          setWalletError(result?.error || "Wallet sign in failed");
          setWalletAuthInProgress(false);
        }
      } catch (error) {
        console.error("Wallet auth error:", error);
        setWalletError("Failed to sign message. Please try again.");
        setWalletAuthInProgress(false);
      }
    };

    if (isConnected) {
      handleWalletSignIn();
    }
  }, [address, isConnected, signMessage, walletAuthInProgress, router]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    await signIn("google", { redirect: true, callbackUrl: "/" });
  };

  // Parallax effect on logo
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const logoEl = document.querySelector("[data-logo-container]") as HTMLElement;
      if (!logoEl) return;
      
      const x = (window.innerWidth / 2 - e.pageX) / 40;
      const y = (window.innerHeight / 2 - e.pageY) / 40;
      logoEl.style.transform = `translate(${x}px, ${y}px)`;
    };

    document.addEventListener("mousemove", handleMouseMove);
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Animate buttons on hover
  useEffect(() => {
    const buttons = document.querySelectorAll("button");
    buttons.forEach((button) => {
      button.addEventListener("mouseenter", () => {
        const ripple = document.createElement("div");
        ripple.classList.add("absolute", "w-full", "h-full", "bg-white/5", "top-0", "left-0", "pointer-events-none");
        button.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
      });
    });
  }, []);

  return (
    <main className="relative min-h-screen overflow-y-auto bg-background text-on-background font-body-md pb-48">
      {/* WebGL Shader Background */}
      <div className="fixed inset-0 w-full h-full -z-10">
        <canvas
          ref={canvasRef}
          id="shader-canvas"
          className="w-full h-full"
          style={{ display: "block" }}
        />
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center py-8">
        {/* Top Security Badge */}
        <div className="mb-6 stagger-1 flex items-center gap-2 px-4 py-2 glass-card rounded-full">
          <span className="text-xs font-label-mono text-secondary">🔒 Bank-Grade Security</span>
          <span className="w-1 h-1 rounded-full bg-secondary"></span>
          <span className="text-xs font-label-mono text-on-surface-variant">SSL Encrypted</span>
        </div>

        {/* Login Container */}
        <div className="w-full max-w-[480px] px-5 flex flex-col items-center">
          {/* Logo Section */}
          <div className="mb-10 flex flex-col items-center" data-logo-container>
            <style>{`
              @keyframes pulse-logo {
                0%, 100% { transform: scale(1); filter: drop-shadow(0 0 20px rgba(221, 183, 255, 0.4)); }
                50% { transform: scale(1.05); filter: drop-shadow(0 0 40px rgba(221, 183, 255, 0.8)); }
              }

              @keyframes entrance-3d {
                0% { opacity: 0; transform: translateY(40px) rotateX(-20deg); }
                100% { opacity: 1; transform: translateY(0) rotateX(0deg); }
              }

              .animate-logo {
                animation: pulse-logo 4s ease-in-out infinite;
              }

              .stagger-1 { animation: entrance-3d 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; animation-delay: 0.2s; }
              .stagger-2 { animation: entrance-3d 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; animation-delay: 0.4s; }
              .stagger-3 { animation: entrance-3d 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; animation-delay: 0.6s; }
              .stagger-4 { animation: entrance-3d 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; animation-delay: 0.8s; }
              .stagger-5 { animation: entrance-3d 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; animation-delay: 1s; }

              .glass-card {
                background: rgba(255, 255, 255, 0.03);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.1);
              }

              .neon-glow:hover {
                box-shadow: 0 0 30px rgba(221, 183, 255, 0.4);
              }
            `}</style>

            <Image
              alt="XOLAT Logo"
              src="https://lh3.googleusercontent.com/aida/AP1WRLuwd9fbmpTItvjGzTccMvEb5rNccwWWHXwGrNIZRJtdZxh0UVVz84pGKfynhMx3UNMrM8ZsxparA__FVZyDoLS73nRf52_v4-qvOALZzySlcsR_e_rZ_REiNOMkZA9rCn9lmDu5Jtl-b3kmzsevYiL4YGcHRq8QUMgEiyndCARSrmSnQi3ZFcYml12EsrW92WpjdZHnD9ZN76Ho7oPZtuu1Os6EwEgQgOYDnwhs_Y5Ml5Xd9BMt-5fHu2LQ"
              width={160}
              height={160}
              className="w-40 h-auto mb-6 animate-logo"
              priority
            />
            <h1 className="font-display-xl text-display-xl text-primary tracking-tighter italic drop-shadow-[0_0_10px_rgba(221,183,255,0.6)] mb-2">
              XOLAT
            </h1>
            <p className="text-xs text-on-surface-variant font-label-mono uppercase tracking-widest">Prediction Arena</p>
          </div>

          {/* Intro Text */}
          <p className="text-center text-on-surface-variant font-body-md mb-2 stagger-1 px-4 leading-relaxed">
            The next-generation USDm prediction arena on Celo. Play, predict, and earn.
          </p>
          <p className="text-center text-xs text-on-surface-variant/60 mb-8 stagger-1 px-4">
            Secure, transparent, and fair prediction gaming powered by blockchain
          </p>

          {/* Authentication Methods */}
          <div className="w-full space-y-3 mb-8 stagger-2">
            {/* Primary Action: Connect Wallet */}
            <button className="group relative w-full h-14 bg-primary text-on-primary font-label-mono text-label-mono uppercase tracking-[0.2em] rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-[1.02] active:scale-95 neon-glow overflow-hidden">
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <ConnectButton />
            </button>

            {walletError && (
              <div className="p-3 glass-card rounded-lg border border-red-500/30 text-xs text-red-300">
                ⚠️ {walletError}
              </div>
            )}

            {walletAuthInProgress && (
              <div className="p-3 glass-card rounded-lg border border-primary/30 text-xs text-primary flex items-center justify-center gap-2">
                <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse" />
                Signing in...
              </div>
            )}

            {/* Google Login */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="group w-full h-14 glass-card text-on-surface font-label-mono text-label-mono uppercase tracking-[0.2em] rounded-xl flex items-center justify-center transition-all duration-300 hover:bg-white/10 active:scale-95 disabled:opacity-50 relative overflow-hidden"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"></path>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor"></path>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="currentColor"></path>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor"></path>
              </svg>
              {isLoading ? "Signing in..." : "Sign in with Google"}
            </button>

            {/* Email Input Field */}
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-14 px-4 rounded-xl glass-card text-on-surface placeholder-on-surface-variant/50 font-body-md outline-none border border-on-surface-variant/20 focus:border-primary/50 transition"
            />

            {/* Email Login */}
            <button 
              onClick={() => handleEmailLogin()}
              className="group w-full h-14 glass-card text-on-surface font-label-mono text-label-mono uppercase tracking-[0.2em] rounded-xl flex items-center justify-center transition-all duration-300 hover:bg-white/10 active:scale-95 relative overflow-hidden"
            >
              <span className="material-symbols-outlined mr-2">mail</span>
              EMAIL LOGIN
            </button>
          </div>

          {/* Remember Me & Terms */}
          <div className="w-full space-y-3 mb-8 stagger-3 px-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 accent-primary cursor-pointer"
              />
              <span className="text-xs text-on-surface-variant group-hover:text-on-surface transition">Remember me for 30 days</span>
            </label>
            
            <label className="flex items-start gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-primary cursor-pointer"
              />
              <span className="text-xs text-on-surface-variant group-hover:text-on-surface transition">
                I agree to XOLAT's <a href="#" className="text-primary hover:underline">Terms of Service</a> and <a href="#" className="text-primary hover:underline">Privacy Policy</a>
              </span>
            </label>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-on-surface-variant/20 to-transparent mb-8 stagger-4"></div>

          {/* Trust Badges */}
          <div className="w-full grid grid-cols-3 gap-3 mb-8 stagger-4">
            <div className="glass-card rounded-lg p-3 text-center">
              <div className="text-lg mb-1">🛡️</div>
              <p className="text-xs text-on-surface-variant">Audited Smart Contracts</p>
            </div>
            <div className="glass-card rounded-lg p-3 text-center">
              <div className="text-lg mb-1">✅</div>
              <p className="text-xs text-on-surface-variant">Instant Payouts</p>
            </div>
            <div className="glass-card rounded-lg p-3 text-center">
              <div className="text-lg mb-1">🌍</div>
              <p className="text-xs text-on-surface-variant">Global Access</p>
            </div>
          </div>

          {/* FAQ Toggle */}
          <button
            onClick={() => setShowFAQ(!showFAQ)}
            className="stagger-5 w-full glass-card rounded-lg p-3 hover:bg-white/10 transition text-left flex items-center justify-between"
          >
            <span className="text-xs font-label-mono text-on-surface uppercase tracking-wider">❓ Common Questions</span>
            <span className={`transition transform ${showFAQ ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {/* FAQ Section */}
          {showFAQ && (
            <div className="w-full mt-4 space-y-2 stagger-5">
              <details className="glass-card rounded-lg p-3 group cursor-pointer hover:bg-white/10 transition">
                <summary className="text-xs font-label-mono text-primary uppercase tracking-wider">Is my wallet secure?</summary>
                <p className="text-xs text-on-surface-variant mt-2">Yes, XOLAT uses bank-grade encryption and does not store private keys.</p>
              </details>
              <details className="glass-card rounded-lg p-3 group cursor-pointer hover:bg-white/10 transition">
                <summary className="text-xs font-label-mono text-primary uppercase tracking-wider">Can I use multiple wallets?</summary>
                <p className="text-xs text-on-surface-variant mt-2">Yes, you can connect and manage multiple wallets in your XOLAT account.</p>
              </details>
              <details className="glass-card rounded-lg p-3 group cursor-pointer hover:bg-white/10 transition">
                <summary className="text-xs font-label-mono text-primary uppercase tracking-wider">How do I withdraw my winnings?</summary>
                <p className="text-xs text-on-surface-variant mt-2">Winnings are automatically sent to your connected wallet instantly.</p>
              </details>
            </div>
          )}

          {/* Support Links */}
          <div className="w-full mt-8 flex flex-wrap justify-center gap-4 text-xs text-on-surface-variant stagger-5">
            <a href="#" className="hover:text-primary transition">📖 Documentation</a>
            <span>•</span>
            <a href="#" className="hover:text-primary transition">💬 Support</a>
            <span>•</span>
            <a href="#" className="hover:text-primary transition">🐛 Report Issues</a>
            <span>•</span>
            <a href="#" className="hover:text-primary transition">🌐 Status</a>
          </div>
        </div>
      </div>

      {/* Floating Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-20 w-full text-center py-4 bg-gradient-to-t from-background via-background/80 to-transparent">
        <div className="flex flex-col items-center gap-2 opacity-70 hover:opacity-100 transition-opacity duration-500">
          <p className="font-label-mono text-label-mono uppercase tracking-wider text-[11px] text-on-surface-variant">
            Powered by XOLAT Engine | Provably Fair
          </p>
          <div className="flex gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
          </div>
        </div>
      </footer>
    </main>
  );
}
