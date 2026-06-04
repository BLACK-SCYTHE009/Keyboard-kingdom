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
const SIGNUP_STEPS = [
  { title: "Account", hint: "Hero ID and email" },
  { title: "Profile", hint: "Public details" },
  { title: "Avatar", hint: "Pick a look" },
  { title: "Class", hint: "Choose a fighter" },
];
const TOTAL_STEPS = SIGNUP_STEPS.length;
const HERO_ID_PATTERN = /^[a-zA-Z0-9_-]{3,32}$/;

const FIELD_LABELS: Record<string, string> = {
  email_address: "email address",
  first_name: "first name",
  last_name: "last name",
  legal_accepted: "terms acceptance",
  password: "password",
  phone_number: "phone number",
  username: "hero ID",
  web3_wallet: "wallet",
};

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error && "errors" in error) {
    const clerkError = error as { errors?: Array<{ message?: string; longMessage?: string }> };
    return clerkError.errors?.[0]?.longMessage || clerkError.errors?.[0]?.message || "Authentication failed";
  }

  if (typeof error === "object" && error && "longMessage" in error) {
    return String((error as { longMessage?: string; message?: string }).longMessage || (error as { message?: string }).message);
  }

  return error instanceof Error ? error.message : "Authentication failed";
}

function fieldList(fields: string[]) {
  return fields.map((field) => FIELD_LABELS[field] || field.replaceAll("_", " ")).join(", ");
}

function isAlreadyVerifiedError(error: unknown) {
  return /already.*verif/i.test(getErrorMessage(error));
}

function AuthField({
  autoComplete,
  hint,
  inputMode,
  label,
  maxLength,
  min,
  max,
  onChange,
  placeholder,
  required,
  rows,
  type = "text",
  value,
}: {
  autoComplete?: string;
  hint?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  label: string;
  maxLength?: number;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  rows?: number;
  type?: "email" | "number" | "password" | "text" | "textarea";
  value: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-left">
      <span className="text-[9px] font-bold uppercase tracking-widest text-gold">{label}</span>
      {type === "textarea" ? (
        <textarea
          maxLength={maxLength}
          placeholder={placeholder}
          rows={rows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-20 w-full resize-none border-2 border-b-black/70 border-l-white/15 border-r-black/70 border-t-white/25 bg-[#111827]/95 p-4 text-[12px] leading-relaxed text-white shadow-inner outline-none transition focus:border-gold"
        />
      ) : (
        <input
          type={type}
          inputMode={inputMode}
          min={min}
          max={max}
          maxLength={maxLength}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full border-2 border-b-black/70 border-l-white/15 border-r-black/70 border-t-white/25 bg-[#111827]/95 p-4 text-[12px] text-white shadow-inner outline-none transition focus:border-gold"
        />
      )}
      {hint && <span className="font-sans text-[11px] leading-relaxed text-gray-300 text-shadow-none">{hint}</span>}
    </label>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const { signIn, fetchStatus: signInFetchStatus } = useSignIn();
  const { signUp, fetchStatus: signUpFetchStatus } = useSignUp();

  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
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
  const [notice, setNotice] = useState("");
  const [verificationPending, setVerificationPending] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [particles, setParticles] = useState<Array<{ left: string; top: string; size: string; duration: string; delay: string }>>([]);

  const isBusy = loading || signInFetchStatus === "fetching" || signUpFetchStatus === "fetching";
  const currentStep = SIGNUP_STEPS[step - 1];

  useEffect(() => {
    setParticles(
      Array.from({ length: 24 }, () => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: `${2 + Math.random() * 4}px`,
        duration: `${4 + Math.random() * 5}s`,
        delay: `${Math.random() * 2}s`,
      })),
    );
  }, []);

  const validateCredentials = () => {
    if (isLogin) {
      if (!username.trim()) return "Enter your hero ID or email.";
      if (!password) return "Enter your password.";
      return null;
    }

    if (!username.trim()) return "Choose a hero ID.";
    if (!HERO_ID_PATTERN.test(username.trim())) return "Hero ID must be 3-32 characters using letters, numbers, _ or -.";
    if (!email.trim()) return "Enter your email address.";
    if (!email.includes("@")) return "Enter a valid email address.";
    if (!password) return "Create a password.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (password !== confirmPassword) return "Passwords do not match.";
    return null;
  };

  const getNameParts = () => {
    const publicName = (displayName.trim() || username.trim()).replace(/\s+/g, " ");
    const [firstName, ...rest] = publicName.split(" ");
    return {
      firstName: firstName || username.trim(),
      lastName: rest.join(" ") || "Player",
    };
  };

  const getProfilePayload = () => {
    const finalCharacter = character === "heroA" && gender === "female" ? "stella" : character;
    return {
      username: username.trim(),
      displayName: displayName.trim() || username.trim(),
      age: age || null,
      gender,
      bio,
      profilePicture: profilePicture || presetAvatar,
      character: finalCharacter,
      avatar: presetAvatar || "1",
    };
  };

  const buildClerkProfileFields = () => {
    const { firstName, lastName } = getNameParts();

    return {
      firstName,
      lastName,
      legalAccepted: true,
      unsafeMetadata: {
        keyboardKingdomProfile: getProfilePayload(),
      },
    };
  };

  const handleFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2MB.");
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
    const payload = getProfilePayload();
    let lastError = "Failed to save profile.";

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) return;

      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      lastError = data?.error || lastError;

      if (response.status !== 401 || attempt === 2) break;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    throw new Error(lastError);
  };

  const finishSignup = async () => {
    if (!signUp) throw new Error("Clerk is still loading.");

    if (signUp.status !== "complete") {
      throw new Error(`Signup is waiting for ${fieldList(signUp.missingFields) || signUp.status}.`);
    }

    const finalizeResult = await signUp.finalize();
    if (finalizeResult.error) throw new Error(getErrorMessage(finalizeResult.error));

    await saveProfile();
    router.replace("/");
    router.refresh();
  };

  const syncMissingClerkFields = async () => {
    if (!signUp) throw new Error("Clerk is still loading.");

    const missing = new Set(signUp.missingFields);
    const supported = new Set([...signUp.requiredFields, ...signUp.optionalFields, ...signUp.missingFields]);
    const fields = buildClerkProfileFields();
    const update: {
      firstName?: string;
      lastName?: string;
      legalAccepted?: boolean;
      username?: string;
      unsafeMetadata?: Record<string, unknown>;
    } = { unsafeMetadata: fields.unsafeMetadata };

    if (supported.has("username") || missing.has("username")) update.username = username.trim();
    if (supported.has("first_name") || missing.has("first_name")) update.firstName = fields.firstName;
    if (supported.has("last_name") || missing.has("last_name")) update.lastName = fields.lastName;
    if (supported.has("legal_accepted") || missing.has("legal_accepted")) update.legalAccepted = true;

    if (Object.keys(update).length <= 1) return;

    const updateResult = await signUp.update(update);
    if (updateResult.error) throw new Error(getErrorMessage(updateResult.error));
  };

  const continueSignup = async ({ sendEmailCode }: { sendEmailCode: boolean }) => {
    if (!signUp) throw new Error("Clerk is still loading.");

    await syncMissingClerkFields();

    if (signUp.status === "complete") {
      await finishSignup();
      return;
    }

    if (signUp.unverifiedFields.includes("email_address")) {
      if (sendEmailCode) {
        const sendCodeResult = await signUp.verifications.sendEmailCode();
        if (sendCodeResult.error) throw new Error(getErrorMessage(sendCodeResult.error));
      }

      setVerificationPending(true);
      setVerificationCode("");
      setNotice(sendEmailCode ? "We sent a verification code to your email." : "Email is verified. Finish creating your account.");
      setLoading(false);
      return;
    }

    const remainingMissing = signUp.missingFields.filter((field) => field !== "email_address");
    if (remainingMissing.length > 0) {
      throw new Error(`Signup needs: ${fieldList(remainingMissing)}.`);
    }

    throw new Error(`Signup is not complete yet: ${signUp.status}.`);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (verificationPending) {
      if (!verificationCode.trim()) {
        setError("Enter the verification code from your email.");
        return;
      }

      setLoading(true);
      try {
        if (!signUp) throw new Error("Clerk is still loading.");
        const verifyResult = await signUp.verifications.verifyEmailCode({ code: verificationCode.trim() });
        if (verifyResult.error && !isAlreadyVerifiedError(verifyResult.error)) {
          throw new Error(getErrorMessage(verifyResult.error));
        }

        await continueSignup({ sendEmailCode: false });
      } catch (authError) {
        setError(getErrorMessage(authError));
        setLoading(false);
      }
      return;
    }

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

        const passwordResult = await signIn.password({ identifier: username.trim(), password });
        if (passwordResult.error) throw new Error(getErrorMessage(passwordResult.error));

        if (signIn.status !== "complete") {
          throw new Error("This login needs another verification step.");
        }

        const finalizeResult = await signIn.finalize();
        if (finalizeResult.error) throw new Error(getErrorMessage(finalizeResult.error));

        router.replace("/");
        router.refresh();
        return;
      }

      if (!signUp) throw new Error("Clerk is still loading.");

      const createResult = await signUp.create({
        emailAddress: email.trim(),
        password,
        legalAccepted: true,
        unsafeMetadata: buildClerkProfileFields().unsafeMetadata,
      });
      if (createResult.error) throw new Error(getErrorMessage(createResult.error));

      await continueSignup({ sendEmailCode: true });
    } catch (authError) {
      setError(getErrorMessage(authError));
      setLoading(false);
    }
  };

  const setMode = (loginMode: boolean) => {
    setIsLogin(loginMode);
    setStep(1);
    setError("");
    setNotice("");
    setVerificationPending(false);
    setVerificationCode("");
  };

  const resetVerification = async () => {
    setVerificationPending(false);
    setVerificationCode("");
    setNotice("");
    setError("");
    await signUp?.reset();
  };

  return (
    <div className="absolute inset-0 z-50 overflow-y-auto bg-classy bg-cover bg-center px-4 py-6 text-center md:px-8">
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-[#0b1220]/30 to-black/65" />
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

      <main className="relative z-20 mx-auto flex min-h-full w-full max-w-6xl flex-col items-center justify-center gap-6 lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,500px)]">
        <section className="w-full text-center lg:text-left">
          <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.35em] text-emerald-300">Clerk + Supabase Realm</p>
          <h1 className="text-center text-4xl tracking-widest text-epic-gold text-shadow-drop md:text-6xl lg:text-left">
            KEYBOARD KINGDOM
          </h1>
          <p className="mx-auto mt-4 max-w-xl font-sans text-sm leading-7 text-gray-100 text-shadow-none lg:mx-0">
            The castle gate is open. Your next run starts here.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2 lg:justify-start">
            {["Moonlit realm", "Hero roster", "Typing arena"].map((badge) => (
              <span key={badge} className="border border-gold/25 bg-black/45 px-3 py-2 font-sans text-xs text-gold text-shadow-none">
                {badge}
              </span>
            ))}
          </div>
        </section>

        <section className="stone-panel relative w-full max-w-[500px] overflow-hidden p-5 shadow-2xl md:p-7">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-gold to-coral" />

          <div className="relative z-10 mb-5 flex bg-black/35 p-1">
            <button
              type="button"
              aria-pressed={isLogin}
              onClick={() => setMode(true)}
              className={`flex-1 px-3 py-3 text-[10px] font-bold uppercase tracking-widest transition ${
                isLogin ? "bg-[#8B5A2B] text-gold shadow-inner" : "text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              aria-pressed={!isLogin}
              onClick={() => setMode(false)}
              className={`flex-1 px-3 py-3 text-[10px] font-bold uppercase tracking-widest transition ${
                !isLogin ? "bg-[#8B5A2B] text-gold shadow-inner" : "text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              Sign Up
            </button>
          </div>

          <div className="relative z-10 mb-5 text-left">
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-gold">
              {verificationPending ? "Verify Email" : isLogin ? "Welcome Back" : `${currentStep.title} - Step ${step} of ${TOTAL_STEPS}`}
            </p>
            <h2 className="mt-2 font-sans text-2xl font-black text-white text-shadow-none">
              {verificationPending ? "Check your inbox" : isLogin ? "Enter the realm" : currentStep.hint}
            </h2>
          </div>

          {!isLogin && !verificationPending && (
            <div className="relative z-10 mb-5 grid grid-cols-4 gap-2">
              {SIGNUP_STEPS.map((item, index) => {
                const stepNumber = index + 1;
                const active = step === stepNumber;
                const complete = step > stepNumber;

                return (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => setStep(stepNumber)}
                    className={`border px-2 py-3 text-left transition ${
                      active
                        ? "border-gold bg-gold/20 text-white"
                        : complete
                          ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                          : "border-white/10 bg-black/25 text-gray-400"
                    }`}
                  >
                    <span className="block text-[9px] font-bold">{complete ? "OK" : `0${stepNumber}`}</span>
                    <span className="mt-1 block font-sans text-[11px] font-bold text-shadow-none">{item.title}</span>
                  </button>
                );
              })}
            </div>
          )}

          {error && (
            <div className="error-shake relative z-10 mb-4 border border-red-500/40 bg-red-950/80 p-3 text-left font-sans text-sm text-red-100 text-shadow-none">
              {error}
            </div>
          )}

          {notice && !error && (
            <div className="relative z-10 mb-4 border border-emerald-400/35 bg-emerald-950/70 p-3 text-left font-sans text-sm text-emerald-100 text-shadow-none">
              {notice}
            </div>
          )}

          <form onSubmit={handleSubmit} className="relative z-10 flex flex-col gap-4">
            {verificationPending && (
              <div className="fade-in flex flex-col gap-4">
                <p className="font-sans text-sm leading-6 text-gray-200 text-shadow-none">
                  Enter the code Clerk sent to <span className="font-bold text-gold">{email}</span>.
                </p>
                <AuthField
                  label="Verification code"
                  placeholder="232207"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={verificationCode}
                  onChange={setVerificationCode}
                  required
                />
              </div>
            )}

            {!verificationPending && (isLogin || step === 1) && (
              <div className="fade-in flex flex-col gap-4">
                <AuthField
                  label={isLogin ? "Hero ID or Email" : "Hero ID"}
                  placeholder={isLogin ? "hero_id or name@email.com" : "your_hero_id"}
                  autoComplete="username"
                  value={username}
                  onChange={setUsername}
                  hint={!isLogin ? "Use 3-32 letters, numbers, underscores, or dashes." : undefined}
                  required
                />
                {!isLogin && (
                  <AuthField
                    label="Email"
                    placeholder="you@example.com"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={setEmail}
                    required
                  />
                )}
                <AuthField
                  label="Password"
                  placeholder={isLogin ? "Your password" : "At least 8 characters"}
                  type="password"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  value={password}
                  onChange={setPassword}
                  required
                />
                {!isLogin && (
                  <AuthField
                    label="Confirm Password"
                    placeholder="Repeat password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    required
                  />
                )}
              </div>
            )}

            {!verificationPending && !isLogin && step === 2 && (
              <div className="fade-in flex flex-col gap-4">
                <AuthField
                  label="Display Name"
                  placeholder="Shown in the kingdom"
                  autoComplete="name"
                  value={displayName}
                  onChange={setDisplayName}
                />
                <AuthField
                  label="Age"
                  placeholder="Optional"
                  type="number"
                  min="1"
                  max="120"
                  value={age}
                  onChange={setAge}
                />
                <div className="text-left">
                  <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-gold">Pronouns / Style</p>
                  <div className="grid grid-cols-3 gap-2">
                    {["male", "female", "other"].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setGender(option)}
                        className={`border px-3 py-3 text-[10px] font-bold uppercase tracking-wider transition ${
                          gender === option ? "border-gold bg-gold/20 text-gold" : "border-white/10 bg-black/30 text-gray-300 hover:bg-white/10"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
                <AuthField
                  label="Short Bio"
                  placeholder="Optional"
                  type="textarea"
                  rows={3}
                  maxLength={150}
                  value={bio}
                  onChange={setBio}
                />
              </div>
            )}

            {!verificationPending && !isLogin && step === 3 && (
              <div className="fade-in flex flex-col items-center gap-5">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-dashed border-white/20 bg-[#111827]/90 font-sans text-sm text-gray-300 text-shadow-none transition hover:scale-105 hover:border-gold/60 hover:text-white"
                >
                  {profilePicture ? <img src={profilePicture} alt="Profile" className="h-full w-full object-cover" /> : presetAvatar || "Upload"}
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
                      className={`border p-3 font-sans text-xs font-bold text-shadow-none transition ${
                        presetAvatar === avatar ? "border-gold bg-gold/20 text-gold" : "border-white/10 bg-black/30 text-gray-300 hover:bg-white/10"
                      }`}
                    >
                      {avatar}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!verificationPending && !isLogin && step === 4 && (
              <div className="fade-in grid grid-cols-1 gap-3 sm:grid-cols-2">
                {HEROES.map((hero) => (
                  <button
                    key={hero.id}
                    type="button"
                    onClick={() => setCharacter(hero.id)}
                    className={`border p-4 text-left transition ${
                      character === hero.id ? "border-gold bg-gold/20 text-white" : "border-white/10 bg-black/30 text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    <span className="block text-[10px] font-bold uppercase tracking-widest">{hero.name}</span>
                    <span className="mt-2 block font-sans text-xs leading-5 text-gray-300 text-shadow-none">{hero.desc}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-2 flex gap-2">
              {!isLogin && (step > 1 || verificationPending) && (
                <button
                  type="button"
                  onClick={() => (verificationPending ? resetVerification() : setStep((current) => Math.max(1, current - 1)))}
                  className="border border-white/15 bg-gray-800 px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-gray-700"
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                disabled={isBusy}
                className="wood-btn flex-1 py-4 text-[11px] font-bold uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isBusy ? "Connecting..." : verificationPending ? "Verify Email" : isLogin ? "Log In" : step === TOTAL_STEPS ? "Create Account" : "Continue"}
              </button>
            </div>

            <p className="font-sans text-xs leading-5 text-gray-300 text-shadow-none">
              {isLogin ? "New here? Switch to Sign Up and build your hero." : "Already have an account? Switch to Log In anytime."}
            </p>
          </form>
        </section>
      </main>
    </div>
  );
}
