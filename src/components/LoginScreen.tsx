"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSignIn, useSignUp } from "@clerk/nextjs";

const HEROES = [
  { id: "heroA", name: "Knight", desc: "Balanced sword fighter" },
  { id: "heroB", name: "Ranger", desc: "Fast and precise" },
  { id: "stella", name: "Stella", desc: "Mystic striker" },
  { id: "tomb_raider_laracroft", name: "Adventurer", desc: "Elite explorer" },
  { id: "realistic_female", name: "Warrior", desc: "Legendary champion" },
];

const PRESET_AVATARS = ["Mage", "Ninja", "Farmer", "King", "Queen", "Hero", "Elf", "Vamp"];
const TOTAL_STEPS = 4;

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error && "errors" in error) {
    const clerkError = error as { errors?: Array<{ message?: string; longMessage?: string }> };
    return clerkError.errors?.[0]?.longMessage || clerkError.errors?.[0]?.message || "Authentication failed";
  }

  return error instanceof Error ? error.message : "Authentication failed";
}

export default function LoginScreen() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const { signIn, fetchStatus: signInFetchStatus } = useSignIn();
  const { signUp, fetchStatus: signUpFetchStatus } = useSignUp();

  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("other");
  const [bio, setBio] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [presetAvatar, setPresetAvatar] = useState("Mage");
  const [character, setCharacter] = useState("heroA");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [particles, setParticles] = useState<Array<{ left: string; top: string; size: string; duration: string; delay: string }>>([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 22 }, () => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: `${2 + Math.random() * 4}px`,
        duration: `${4 + Math.random() * 5}s`,
        delay: `${Math.random() * 2}s`,
      })),
    );
  }, []);

  const validateCredentials = () => {
    if (!username.trim()) return "Username is required";
    if (username.trim().length < 2) return "Username must be at least 2 characters";
    if (!password) return "Password is required";
    if (password.length < 3) return "Password must be at least 3 characters";
    if (!isLogin && password !== confirmPassword) return "Passwords do not match";
    return null;
  };

  const handleFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProfilePicture(String(reader.result || ""));
      setPresetAvatar("");
    };
    reader.readAsDataURL(file);
  }, []);

  const saveProfile = async () => {
    const finalCharacter = character === "heroA" && gender === "female" ? "stella" : character;
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username.trim(),
        displayName: displayName.trim() || username.trim(),
        age: age || null,
        gender,
        bio,
        profilePicture: profilePicture || presetAvatar,
        character: finalCharacter,
        avatar: presetAvatar || "1",
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error || "Failed to save profile.");
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    const credentialsError = validateCredentials();
    if (credentialsError) {
      setError(credentialsError);
      return;
    }

    if (!isLogin && step < TOTAL_STEPS) {
      setStep((current) => current + 1);
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        if (!signIn) throw new Error("Clerk is still loading.");
        const createResult = await signIn.create({ identifier: username.trim() });
        if (createResult.error) throw new Error(createResult.error.message);

        const passwordResult = await signIn.password({ password });
        if (passwordResult.error) throw new Error(passwordResult.error.message);

        if (signIn.status !== "complete") {
          throw new Error("This sign-in needs another verification step.");
        }

        const finalizeResult = await signIn.finalize();
        if (finalizeResult.error) throw new Error(finalizeResult.error.message);
      } else {
        if (!signUp) throw new Error("Clerk is still loading.");
        const createResult = await signUp.create({ username: username.trim(), password });
        if (createResult.error) throw new Error(createResult.error.message);

        if (signUp.status !== "complete") {
          throw new Error(`Signup needs another verification step: ${signUp.status}`);
        }

        const finalizeResult = await signUp.finalize();
        if (finalizeResult.error) throw new Error(finalizeResult.error.message);
        await saveProfile();
      }

      router.replace("/");
      router.refresh();
    } catch (authError) {
      setError(getErrorMessage(authError));
      setLoading(false);
    }
  };

  const setMode = (loginMode: boolean) => {
    setIsLogin(loginMode);
    setStep(1);
    setError("");
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden bg-classy bg-cover bg-center px-4 text-center">
      <div className="fireflies">
        {particles.map((particle, index) => (
          <div
            key={index}
            className="absolute rounded-full bg-yellow-300"
            style={{
              left: particle.left,
              top: particle.top,
              width: particle.size,
              height: particle.size,
              boxShadow: "0 0 8px rgba(255, 255, 0, 0.8)",
              animation: `bounce ${particle.duration} ease-in-out infinite alternate`,
              animationDelay: particle.delay,
            }}
          />
        ))}
      </div>

      <div className="slide-in-top relative z-20 flex w-full max-w-md flex-col items-center">
        <h1 className="mb-2 text-center text-3xl tracking-widest text-epic-gold text-shadow-drop md:text-4xl">
          KEYBOARD KINGDOM
        </h1>
        <div className="blocky-border-inner mb-6 bg-black/70 px-6 py-2 text-[9px] tracking-widest text-gray-300">
          {isLogin ? "RETURN TO THE REALM" : `STEP ${step} OF ${TOTAL_STEPS}`}
        </div>

        <div className="stone-panel relative w-full max-w-[390px] overflow-hidden p-5 shadow-2xl lg:p-7">
          <div className="relative z-10 mb-5 flex gap-2">
            <button
              type="button"
              onClick={() => setMode(true)}
              className={`blocky-border flex-1 py-3 text-[9px] font-bold tracking-wider transition-all ${
                isLogin ? "bg-[#8B5A2B] text-gold" : "bg-[#2a2a2a] text-gray-500 hover:bg-[#333]"
              }`}
            >
              LOG IN
            </button>
            <button
              type="button"
              onClick={() => setMode(false)}
              className={`blocky-border flex-1 py-3 text-[9px] font-bold tracking-wider transition-all ${
                !isLogin ? "bg-[#8B5A2B] text-gold" : "bg-[#2a2a2a] text-gray-500 hover:bg-[#333]"
              }`}
            >
              SIGN UP
            </button>
          </div>

          {!isLogin && (
            <div className="relative z-10 mb-5 flex justify-between">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="flex flex-1 items-center">
                  <div
                    className={`flex h-7 w-7 items-center justify-center border-2 text-[8px] font-bold transition-all ${
                      step > item
                        ? "border-emerald-400 bg-emerald-600 text-white"
                        : step === item
                          ? "scale-110 border-gold bg-gold/30 text-gold"
                          : "border-gray-700 bg-black/40 text-gray-600"
                    }`}
                  >
                    {step > item ? "OK" : item}
                  </div>
                  {item < 4 && <div className={`mx-1 h-1 flex-1 ${step > item ? "bg-emerald-500" : "bg-black/40"}`} />}
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="error-shake relative z-10 mb-3 border-2 border-red-900 bg-red-950/80 p-3 text-center text-[9px] font-bold text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="relative z-10 flex flex-col gap-3">
            {(isLogin || step === 1) && (
              <div className="fade-in flex flex-col gap-3">
                <input
                  type="text"
                  placeholder={isLogin ? "USERNAME" : "CHOOSE USERNAME"}
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="w-full border-2 border-b-gray-700 border-l-black border-r-gray-700 border-t-black bg-[#1a1a1a] p-4 text-[10px] text-gray-200 shadow-inner transition-colors focus:outline-none"
                />
                <input
                  type="password"
                  placeholder={isLogin ? "PASSWORD" : "CREATE PASSWORD"}
                  required
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full border-2 border-b-gray-700 border-l-black border-r-gray-700 border-t-black bg-[#1a1a1a] p-4 text-[10px] text-gray-200 shadow-inner transition-colors focus:outline-none"
                />
                {!isLogin && (
                  <input
                    type="password"
                    placeholder="CONFIRM PASSWORD"
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full border-2 border-b-gray-700 border-l-black border-r-gray-700 border-t-black bg-[#1a1a1a] p-4 text-[10px] text-gray-200 shadow-inner transition-colors focus:outline-none"
                  />
                )}
              </div>
            )}

            {!isLogin && step === 2 && (
              <div className="fade-in flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="DISPLAY NAME"
                  autoComplete="off"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="w-full border-2 border-b-gray-700 border-l-black border-r-gray-700 border-t-black bg-[#1a1a1a] p-4 text-[10px] text-gray-200 shadow-inner"
                />
                <input
                  type="number"
                  placeholder="AGE"
                  min="1"
                  max="120"
                  value={age}
                  onChange={(event) => setAge(event.target.value)}
                  className="w-full border-2 border-b-gray-700 border-l-black border-r-gray-700 border-t-black bg-[#1a1a1a] p-4 text-[10px] text-gray-200 shadow-inner"
                />
                <div className="grid grid-cols-3 gap-2">
                  {["male", "female", "other"].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setGender(option)}
                      className={`blocky-border py-3 text-[8px] font-bold uppercase tracking-wider transition-all ${
                        gender === option ? "bg-[#8B5A2B] text-gold" : "bg-[#2a2a2a] text-gray-500 hover:bg-[#333]"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <textarea
                  placeholder="SHORT BIO (OPTIONAL)"
                  maxLength={150}
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  className="h-16 w-full resize-none border-2 border-b-gray-700 border-l-black border-r-gray-700 border-t-black bg-[#1a1a1a] p-4 text-[10px] text-gray-200 shadow-inner"
                />
              </div>
            )}

            {!isLogin && step === 3 && (
              <div className="fade-in flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-dashed border-gray-600 bg-[#1a1a1a] text-[9px] text-gray-400 transition-all hover:scale-105 hover:border-gold/50"
                >
                  {profilePicture ? <img src={profilePicture} alt="Profile" className="h-full w-full object-cover" /> : presetAvatar || "UPLOAD"}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                <div className="grid w-full grid-cols-4 gap-2">
                  {PRESET_AVATARS.map((avatar) => (
                    <button
                      key={avatar}
                      type="button"
                      onClick={() => {
                        setPresetAvatar(avatar);
                        setProfilePicture("");
                      }}
                      className={`blocky-border aspect-square p-2 text-[8px] transition-all ${
                        presetAvatar === avatar ? "border-gold bg-gold/20" : "border-gray-700 bg-black/40 opacity-70 hover:opacity-100"
                      }`}
                    >
                      {avatar}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isLogin && step === 4 && (
              <div className="fade-in flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2">
                  {HEROES.map((hero) => (
                    <button
                      key={hero.id}
                      type="button"
                      onClick={() => setCharacter(hero.id)}
                      className={`blocky-border p-3 text-left transition-all ${
                        character === hero.id ? "border-gold bg-gold/20" : "border-gray-700 bg-black/40 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <div className="text-[9px] text-white">{hero.name}</div>
                      <div className="mt-1 text-[6px] text-gray-400">{hero.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-2 flex gap-2">
              {!isLogin && step > 1 && (
                <button type="button" onClick={() => setStep((current) => Math.max(1, current - 1))} className="blocky-border bg-gray-700 px-4 py-4 text-[9px] text-white hover:bg-gray-600">
                  BACK
                </button>
              )}
              <button type="submit" disabled={loading || signInFetchStatus === "fetching" || signUpFetchStatus === "fetching"} className="wood-btn flex-1 py-4 text-[10px] font-bold tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-50">
                {loading ? "CONNECTING..." : isLogin ? "JOIN REALM" : step === TOTAL_STEPS ? "BEGIN ADVENTURE" : "NEXT STEP"}
              </button>
            </div>
          </form>
        </div>

        <div className="fade-in-up mt-6 text-[7px] font-bold tracking-widest text-gray-400 opacity-60">V2.0 CLERK + SUPABASE EDITION</div>
      </div>
    </div>
  );
}
