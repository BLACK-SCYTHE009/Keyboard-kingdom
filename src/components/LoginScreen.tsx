"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSignIn as useFutureSignIn, useSignUp as useFutureSignUp } from "@clerk/nextjs";

const HEROES = [
  { id: "heroA", name: "Knight", desc: "Balanced sword fighter" },
  { id: "heroB", name: "Ranger", desc: "Fast and precise" },
  { id: "stella", name: "Stella", desc: "Mystic striker" },
  { id: "tomb_raider_laracroft", name: "Adventurer", desc: "Elite explorer" },
  { id: "realistic_female", name: "Warrior", desc: "Legendary champion" },
];

const PRESET_AVATARS = ["Mage", "Ninja", "Farmer", "King", "Queen", "Hero", "Elf", "Vamp"];
const SIGNUP_STEPS = [
  { title: "Method", hint: "How you'll sign in" },
  { title: "Profile", hint: "Public details" },
  { title: "Avatar", hint: "Pick a look" },
  { title: "Class", hint: "Choose a fighter" },
];
const TOTAL_STEPS = SIGNUP_STEPS.length;
const HERO_ID_PATTERN = /^[a-zA-Z0-9_-]{3,32}$/;
const AVATAR_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const AVATAR_TARGET_BYTES = 650 * 1024;
const AVATAR_SIZE = 512;
const PHONE_REQUIREMENT_MESSAGE =
  "Clerk is still configured to require a phone number. Turn Phone off or make it optional in Clerk Dashboard > User & Authentication, then start sign-up again. The game is set up for email-only accounts.";
const SOCIAL_PROVIDERS = [
  { label: "Google", strategy: "oauth_google" },
  { label: "Facebook", strategy: "oauth_facebook" },
] as const;
const SOCIAL_REDIRECT_RECOVERY_MS = 8000;

type AuthView = "auth" | "forgot" | "reset";
type SocialStrategy = (typeof SOCIAL_PROVIDERS)[number]["strategy"];
type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];
type SignupMethod = "none" | "email" | SocialStrategy;

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

function getAuthRedirects() {
  return {
    redirectUrl: "/",
    redirectCallbackUrl: "/sso-callback",
  };
}

function GoogleLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.83-.07-1.64-.22-2.41H12v4.56h6.45a5.5 5.5 0 0 1-2.39 3.61v2.99h3.87c2.26-2.08 3.57-5.15 3.57-8.75Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-2.99c-1.07.72-2.44 1.14-4.06 1.14-3.13 0-5.78-2.11-6.73-4.95H1.29v3.08A11.98 11.98 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29A7.19 7.19 0 0 1 4.88 12c0-.79.14-1.56.39-2.29V6.63H1.29A11.98 11.98 0 0 0 0 12c0 1.93.46 3.76 1.29 5.37l3.98-3.08Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.76c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.18 15.24 0 12 0A11.98 11.98 0 0 0 1.29 6.63l3.98 3.08C6.22 6.87 8.87 4.76 12 4.76Z"
      />
    </svg>
  );
}

function FacebookLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="currentColor"
        d="M15.12 8.04h2.35V4.14A31.2 31.2 0 0 0 14.05 4c-3.39 0-5.71 2.07-5.71 5.86v3.26H4.5v4.36h3.84V24h4.58v-6.52h3.79l.6-4.36h-4.39V10.3c0-1.26.34-2.26 2.2-2.26Z"
      />
    </svg>
  );
}

function SocialLogo({ provider }: { provider: SocialProvider }) {
  return provider.strategy === "oauth_google" ? <GoogleLogo /> : <FacebookLogo />;
}

function socialButtonClass(provider: SocialProvider) {
  if (provider.strategy === "oauth_google") {
    return "border border-[#dadce0] bg-white text-[#3c4043] shadow-[0_1px_2px_rgba(60,64,67,0.3)] hover:bg-[#f8fafd] hover:shadow-[0_2px_6px_rgba(60,64,67,0.25)]";
  }

  return "border border-[#1877F2] bg-[#1877F2] text-white shadow-[0_1px_3px_rgba(24,119,242,0.45)] hover:bg-[#166FE5] hover:shadow-[0_2px_8px_rgba(24,119,242,0.35)]";
}

function socialIconClass(provider: SocialProvider) {
  return provider.strategy === "oauth_google" ? "bg-white" : "text-white";
}

function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read that image. Try another file."));
    reader.readAsDataURL(blob);
  });
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That image could not be opened. Try a JPG, PNG, or WebP."));
    };
    image.src = url;
  });
}

async function compressAvatar(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file for your profile picture.");
  }

  if (file.size > AVATAR_MAX_UPLOAD_BYTES) {
    throw new Error("Choose an image under 5MB. The app will shrink it before saving.");
  }

  const image = await loadImage(file);
  const scale = Math.min(1, AVATAR_SIZE / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
  const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
  const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not resize that image.");

  context.fillStyle = "#111827";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const qualities = [0.82, 0.7, 0.58];
  for (const quality of qualities) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) continue;
    if (blob.size <= AVATAR_TARGET_BYTES || quality === qualities[qualities.length - 1]) {
      return readBlobAsDataUrl(blob);
    }
  }

  throw new Error("That image was too large after resizing. Try a smaller picture.");
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
    <label className="flex flex-col gap-2 text-left font-sans text-shadow-none">
      <span className="text-[11px] font-bold uppercase tracking-widest text-gold">{label}</span>
      {type === "textarea" ? (
        <textarea
          maxLength={maxLength}
          placeholder={placeholder}
          rows={rows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-20 w-full resize-none border-2 border-b-black/70 border-l-white/15 border-r-black/70 border-t-white/25 bg-[#111827]/95 p-3.5 text-[15px] leading-6 text-white shadow-inner outline-none transition focus:border-gold"
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
          className="w-full border-2 border-b-black/70 border-l-white/15 border-r-black/70 border-t-white/25 bg-[#111827]/95 p-3.5 text-[15px] text-white shadow-inner outline-none transition focus:border-gold"
        />
      )}
      {hint && <span className="text-xs leading-relaxed text-gray-300">{hint}</span>}
    </label>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const { signIn, fetchStatus: signInFetchStatus } = useFutureSignIn();
  const { signUp, fetchStatus: signUpFetchStatus } = useFutureSignUp();

  const [isLogin, setIsLogin] = useState(true);
  const [authView, setAuthView] = useState<AuthView>("auth");
  const [signupMethod, setSignupMethod] = useState<SignupMethod>("none");
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("other");
  const [bio, setBio] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [presetAvatar, setPresetAvatar] = useState("Mage");
  const [character, setCharacter] = useState("heroA");
  const [avatarNotice, setAvatarNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [verificationPending, setVerificationPending] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [particles, setParticles] = useState<Array<{ left: string; top: string; size: string; duration: string; delay: string }>>([]);

  const isBusy = loading || signInFetchStatus === "fetching" || signUpFetchStatus === "fetching";
  const currentStep = SIGNUP_STEPS[step - 1];
  const selectedSignupProvider = SOCIAL_PROVIDERS.find((provider) => provider.strategy === signupMethod);
  const panelEyebrow =
    authView === "forgot" ? "Password Help" : authView === "reset" ? "Reset Password" : verificationPending ? "Verify Email" : isLogin ? "Welcome Back" : `${currentStep.title} - Step ${step} of ${TOTAL_STEPS}`;
  const panelTitle =
    authView === "forgot" ? "Get a reset code" : authView === "reset" ? "Choose a new password" : verificationPending ? "Check your inbox" : isLogin ? "Enter the realm" : currentStep.hint;

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

    if (signupMethod === "none") return "Choose Email, Google, or Facebook first.";
    if (!username.trim()) return "Choose a hero ID.";
    if (!HERO_ID_PATTERN.test(username.trim())) return "Hero ID must be 3-32 characters using letters, numbers, _ or -.";
    if (signupMethod !== "email") return null;
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

  const handleFile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setNotice("");
    setAvatarNotice("");

    try {
      const avatar = await compressAvatar(file);
      setProfilePicture(avatar);
      setPresetAvatar("");
      setAvatarNotice("Profile picture ready. It was resized so Supabase can save it cleanly.");
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
    } finally {
      input.value = "";
    }
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
      if (remainingMissing.includes("phone_number")) {
        setVerificationPending(false);
        setStep(1);
        await signUp.reset();
        throw new Error(PHONE_REQUIREMENT_MESSAGE);
      }

      throw new Error(`Signup needs: ${fieldList(remainingMissing)}.`);
    }

    throw new Error(`Signup is not complete yet: ${signUp.status}.`);
  };

  const requestPasswordReset = async () => {
    const targetEmail = (resetEmail || (username.includes("@") ? username : "") || email).trim();

    if (!targetEmail || !targetEmail.includes("@")) {
      setError("Enter the email address on your account.");
      return;
    }

    setLoading(true);
    try {
      if (!signIn) throw new Error("Clerk is still loading.");

      const createResult = await signIn.create({ identifier: targetEmail });
      if (createResult.error) throw new Error(getErrorMessage(createResult.error));

      const codeResult = await signIn.resetPasswordEmailCode.sendCode();
      if (codeResult.error) throw new Error(getErrorMessage(codeResult.error));

      setResetEmail(targetEmail);
      setAuthView("reset");
      setResetCode("");
      setNewPassword("");
      setConfirmNewPassword("");
      setNotice(`We sent a reset code to ${targetEmail}.`);
      setLoading(false);
    } catch (resetError) {
      setError(getErrorMessage(resetError));
      setLoading(false);
    }
  };

  const submitPasswordReset = async () => {
    if (!resetCode.trim()) {
      setError("Enter the reset code from your email.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      if (!signIn) throw new Error("Clerk is still loading.");

      const verifyResult = await signIn.resetPasswordEmailCode.verifyCode({ code: resetCode.trim() });
      if (verifyResult.error) throw new Error(getErrorMessage(verifyResult.error));

      const passwordResult = await signIn.resetPasswordEmailCode.submitPassword({
        password: newPassword,
        signOutOfOtherSessions: true,
      });
      if (passwordResult.error) throw new Error(getErrorMessage(passwordResult.error));

      if (signIn.status !== "complete") {
        throw new Error("Password reset needs another verification step.");
      }

      const finalizeResult = await signIn.finalize();
      if (finalizeResult.error) throw new Error(getErrorMessage(finalizeResult.error));

      router.replace("/");
      router.refresh();
    } catch (resetError) {
      setError(getErrorMessage(resetError));
      setLoading(false);
    }
  };

  const startSocialAuth = (strategy: SocialStrategy) => {
    setError("");
    setNotice("");
    setLoading(true);

    try {
      const { redirectUrl, redirectCallbackUrl } = getAuthRedirects();
      const createRedirectErrorHandler = () => {
        const recoverFromBlockedRedirect = window.setTimeout(() => {
          setLoading(false);
          setNotice("Still here? Your browser may have blocked the sign-in redirect. Try again or use email login.");
        }, SOCIAL_REDIRECT_RECOVERY_MS);

        return (socialError: unknown) => {
          window.clearTimeout(recoverFromBlockedRedirect);
          setError(`${getErrorMessage(socialError)} Enable this provider in Clerk if it is not turned on yet.`);
          setLoading(false);
        };
      };

      if (isLogin) {
        if (!signIn) throw new Error("Clerk is still loading.");
        const handleRedirectError = createRedirectErrorHandler();
        void signIn
          .sso({
            strategy,
            redirectUrl,
            redirectCallbackUrl,
          })
          .then((result) => {
            if (result.error) handleRedirectError(result.error);
          })
          .catch(handleRedirectError);
        return;
      }

      if (step < TOTAL_STEPS) {
        setError("Complete the hero setup before creating the account.");
        setLoading(false);
        return;
      }

      if (!username.trim()) {
        setError("Choose a hero ID before using Google or Facebook.");
        setLoading(false);
        return;
      }

      if (!HERO_ID_PATTERN.test(username.trim())) {
        setError("Hero ID must be 3-32 characters using letters, numbers, _ or -.");
        setLoading(false);
        return;
      }

      if (!signUp) throw new Error("Clerk is still loading.");
      const profileFields = buildClerkProfileFields();
      const handleRedirectError = createRedirectErrorHandler();
      void signUp
        .sso({
          strategy,
          redirectUrl,
          redirectCallbackUrl,
          firstName: profileFields.firstName,
          lastName: profileFields.lastName,
          legalAccepted: true,
          unsafeMetadata: profileFields.unsafeMetadata,
        })
        .then((result) => {
          if (result.error) handleRedirectError(result.error);
        })
        .catch(handleRedirectError);
    } catch (socialError) {
      setError(`${getErrorMessage(socialError)} Enable this provider in Clerk if it is not turned on yet.`);
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (authView === "forgot") {
      await requestPasswordReset();
      return;
    }

    if (authView === "reset") {
      await submitPasswordReset();
      return;
    }

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

    if (!isLogin && signupMethod !== "email") {
      if (signupMethod === "none") {
        setError("Choose Email, Google, or Facebook first.");
        return;
      }

      startSocialAuth(signupMethod);
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
    setAuthView("auth");
    setSignupMethod("none");
    setStep(1);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setNotice("");
    setVerificationPending(false);
    setVerificationCode("");
  };

  const showForgotPassword = async () => {
    setIsLogin(true);
    setAuthView("forgot");
    setResetEmail((username.includes("@") ? username : email).trim());
    setResetCode("");
    setNewPassword("");
    setConfirmNewPassword("");
    setVerificationPending(false);
    setError("");
    setNotice("");
    await signIn?.reset();
  };

  const returnToLogin = async () => {
    setAuthView("auth");
    setIsLogin(true);
    setResetCode("");
    setNewPassword("");
    setConfirmNewPassword("");
    setError("");
    setNotice("");
    await signIn?.reset();
  };

  const resetVerification = async () => {
    setVerificationPending(false);
    setVerificationCode("");
    setNotice("");
    setError("");
    await signUp?.reset();
  };

  return (
    <div className="absolute inset-0 z-50 overflow-y-auto bg-classy bg-cover bg-center px-4 py-6 text-center font-sans text-shadow-none md:px-8">
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
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-emerald-300">Email-only hero accounts</p>
          <h1 className="text-center font-serif text-5xl font-black tracking-[0.1em] text-epic-gold text-shadow-drop md:text-7xl lg:text-left">
            KEYBOARD KINGDOM
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-gray-100 lg:mx-0">
            A friendlier gate for the kingdom: clear steps, readable fields, no phone-number quest.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2 lg:justify-start">
            {["Google or Facebook", "Forgot password", "Profile picture ready"].map((badge) => (
              <span key={badge} className="border border-gold/25 bg-black/45 px-3 py-2 text-sm text-gold">
                {badge}
              </span>
            ))}
          </div>
        </section>

        <section className="stone-panel relative w-full max-w-[540px] overflow-hidden p-5 shadow-2xl md:p-7">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-gold to-coral" />

          <div className="relative z-10 mb-5 flex bg-black/35 p-1">
            <button
              type="button"
              aria-pressed={isLogin}
              onClick={() => setMode(true)}
              className={`flex-1 px-3 py-3 text-xs font-bold uppercase tracking-widest transition ${
                isLogin ? "bg-[#8B5A2B] text-gold shadow-inner" : "text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              aria-pressed={!isLogin}
              onClick={() => setMode(false)}
              className={`flex-1 px-3 py-3 text-xs font-bold uppercase tracking-widest transition ${
                !isLogin ? "bg-[#8B5A2B] text-gold shadow-inner" : "text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              Sign Up
            </button>
          </div>

          <div className="relative z-10 mb-5 text-left">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">{panelEyebrow}</p>
            <h2 className="mt-2 text-3xl font-black text-white">{panelTitle}</h2>
            {!isLogin && authView === "auth" && !verificationPending && (
              <p className="mt-2 text-sm leading-6 text-gray-200">
                Pick Google, Facebook, or email first. The rest of the hero setup stays the same.
              </p>
            )}
          </div>

          {authView === "auth" && isLogin && !verificationPending && (
            <div className="relative z-10 mb-5">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SOCIAL_PROVIDERS.map((provider) => (
                  <button
                    key={provider.strategy}
                    type="button"
                    data-testid={`social-${provider.strategy}`}
                    disabled={isBusy}
                    onClick={() => startSocialAuth(provider.strategy)}
                    className={`flex min-h-12 items-center justify-center gap-3 px-4 py-3 text-sm font-semibold transition hover:scale-[1.015] disabled:cursor-not-allowed disabled:opacity-60 ${socialButtonClass(provider)}`}
                  >
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full ${socialIconClass(provider)}`}>
                      <SocialLogo provider={provider} />
                    </span>
                    Continue with {provider.label}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-gray-300">
                <span className="h-px flex-1 bg-white/15" />
                <span>or log in below</span>
                <span className="h-px flex-1 bg-white/15" />
              </div>
            </div>
          )}

          {!isLogin && authView === "auth" && !verificationPending && (
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
                    <span className="block text-[11px] font-bold">{complete ? "OK" : `0${stepNumber}`}</span>
                    <span className="mt-1 block text-xs font-bold">{item.title}</span>
                  </button>
                );
              })}
            </div>
          )}

          {error && (
            <div className="error-shake relative z-10 mb-4 border border-red-500/40 bg-red-950/80 p-3 text-left text-sm leading-6 text-red-100">
              {error}
            </div>
          )}

          {notice && !error && (
            <div className="relative z-10 mb-4 border border-emerald-400/35 bg-emerald-950/70 p-3 text-left text-sm leading-6 text-emerald-100">
              {notice}
            </div>
          )}

          <div id="clerk-captcha" className="relative z-10 flex justify-center" />

          <form onSubmit={handleSubmit} className="relative z-10 flex flex-col gap-4">
            {authView === "forgot" && (
              <div className="fade-in flex flex-col gap-4">
                <p className="text-sm leading-6 text-gray-200">Enter the email on your account. Clerk will send a code so you can choose a new password.</p>
                <AuthField
                  label="Account email"
                  placeholder="you@example.com"
                  type="email"
                  autoComplete="email"
                  value={resetEmail}
                  onChange={setResetEmail}
                  required
                />
              </div>
            )}

            {authView === "reset" && (
              <div className="fade-in flex flex-col gap-4">
                <p className="text-sm leading-6 text-gray-200">
                  Enter the code sent to <span className="font-bold text-gold">{resetEmail}</span>.
                </p>
                <AuthField
                  label="Reset code"
                  placeholder="123456"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={resetCode}
                  onChange={setResetCode}
                  required
                />
                <AuthField
                  label="New password"
                  placeholder="At least 8 characters"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={setNewPassword}
                  required
                />
                <AuthField
                  label="Confirm new password"
                  placeholder="Repeat new password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmNewPassword}
                  onChange={setConfirmNewPassword}
                  required
                />
              </div>
            )}

            {authView === "auth" && verificationPending && (
              <div className="fade-in flex flex-col gap-4">
                <p className="text-sm leading-6 text-gray-200">
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

            {authView === "auth" && !verificationPending && (isLogin || step === 1) && (
              <div className="fade-in flex flex-col gap-4">
                {!isLogin && (
                  <div className="grid grid-cols-1 gap-2">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {SOCIAL_PROVIDERS.map((provider) => {
                        const selected = signupMethod === provider.strategy;

                        return (
                          <button
                            key={provider.strategy}
                            type="button"
                            aria-pressed={selected}
                            data-testid={`choose-${provider.strategy}`}
                            onClick={() => {
                              setSignupMethod(provider.strategy);
                              setEmail("");
                              setPassword("");
                              setConfirmPassword("");
                              setError("");
                              setNotice("");
                            }}
                            className={`flex min-h-12 items-center justify-center gap-3 px-4 py-3 text-sm font-semibold transition hover:scale-[1.015] ${
                              selected ? "ring-2 ring-gold ring-offset-2 ring-offset-[#252320]" : ""
                            } ${socialButtonClass(provider)}`}
                          >
                            <span className={`flex h-7 w-7 items-center justify-center rounded-full ${socialIconClass(provider)}`}>
                              <SocialLogo provider={provider} />
                            </span>
                            Use {provider.label}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      aria-pressed={signupMethod === "email"}
                      data-testid="choose-email-password"
                      onClick={() => {
                        setSignupMethod("email");
                        setError("");
                        setNotice("");
                      }}
                      className={`min-h-12 border px-4 py-3 text-sm font-bold uppercase tracking-widest transition hover:bg-white/10 ${
                        signupMethod === "email" ? "border-gold bg-gold/20 text-gold" : "border-white/15 bg-black/30 text-gray-200"
                      }`}
                    >
                      Use Email + Password
                    </button>
                  </div>
                )}

                {(isLogin || signupMethod !== "none") && (
                  <AuthField
                    label={isLogin ? "Hero ID or Email" : "Hero ID"}
                    placeholder={isLogin ? "hero_id or name@email.com" : "your_hero_id"}
                    autoComplete="username"
                    value={username}
                    onChange={setUsername}
                    hint={!isLogin ? "Use 3-32 letters, numbers, underscores, or dashes." : undefined}
                    required
                  />
                )}

                {!isLogin && selectedSignupProvider && (
                  <div className="border border-emerald-400/25 bg-emerald-950/45 p-3 text-left text-sm leading-6 text-emerald-100">
                    {selectedSignupProvider.label} will provide the email. No Gmail field and no email code here.
                  </div>
                )}

                {!isLogin && signupMethod === "email" && (
                  <>
                    <AuthField
                      label="Email"
                      placeholder="you@example.com"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={setEmail}
                      required
                    />
                    <AuthField
                      label="Password"
                      placeholder="At least 8 characters"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={setPassword}
                      required
                    />
                    <AuthField
                      label="Confirm Password"
                      placeholder="Repeat password"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      required
                    />
                  </>
                )}

                {isLogin && (
                  <AuthField
                    label="Password"
                    placeholder="Your password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={setPassword}
                    required
                  />
                )}
              </div>
            )}

            {authView === "auth" && !verificationPending && !isLogin && step === 2 && (
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
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-gold">Pronouns / Style</p>
                  <div className="grid grid-cols-3 gap-2">
                    {["male", "female", "other"].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setGender(option)}
                        className={`border px-3 py-3 text-xs font-bold uppercase tracking-wider transition ${
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

            {authView === "auth" && !verificationPending && !isLogin && step === 3 && (
              <div className="fade-in flex flex-col items-center gap-5">
                <button
                  type="button"
                  aria-label="Upload profile picture"
                  onClick={() => fileRef.current?.click()}
                  className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-dashed border-white/20 bg-[#111827]/90 text-sm font-bold text-gray-300 transition hover:scale-105 hover:border-gold/60 hover:text-white"
                  style={
                    profilePicture
                      ? {
                          backgroundImage: `url(${profilePicture})`,
                          backgroundPosition: "center",
                          backgroundSize: "cover",
                        }
                      : undefined
                  }
                >
                  {!profilePicture && (presetAvatar || "Upload")}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                <p className="max-w-sm text-center text-xs leading-5 text-gray-300">Upload a JPG, PNG, or WebP under 5MB. The game compresses it before saving.</p>
                {avatarNotice && <p className="text-center text-xs font-bold text-emerald-300">{avatarNotice}</p>}
                <div className="grid w-full grid-cols-4 gap-2">
                  {PRESET_AVATARS.map((avatar) => (
                    <button
                      key={avatar}
                      type="button"
                      onClick={() => {
                        setPresetAvatar(avatar);
                        setProfilePicture("");
                        setAvatarNotice("");
                      }}
                      className={`border p-3 text-xs font-bold transition ${
                        presetAvatar === avatar ? "border-gold bg-gold/20 text-gold" : "border-white/10 bg-black/30 text-gray-300 hover:bg-white/10"
                      }`}
                    >
                      {avatar}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {authView === "auth" && !verificationPending && !isLogin && step === 4 && (
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
                    <span className="block text-xs font-bold uppercase tracking-widest">{hero.name}</span>
                    <span className="mt-2 block text-xs leading-5 text-gray-300">{hero.desc}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-2 flex gap-2">
              {authView !== "auth" && (
                <button
                  type="button"
                  onClick={returnToLogin}
                  className="border border-white/15 bg-gray-800 px-4 py-4 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-gray-700"
                >
                  Back
                </button>
              )}
              {authView === "auth" && !isLogin && (step > 1 || verificationPending) && (
                <button
                  type="button"
                  onClick={() => (verificationPending ? resetVerification() : setStep((current) => Math.max(1, current - 1)))}
                  className="border border-white/15 bg-gray-800 px-4 py-4 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-gray-700"
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                disabled={isBusy}
                className="wood-btn flex-1 py-4 text-xs font-bold uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isBusy
                  ? "Connecting..."
                  : authView === "forgot"
                    ? "Send Reset Code"
                    : authView === "reset"
                      ? "Update Password"
                      : verificationPending
                        ? "Verify Email"
                        : isLogin
                          ? "Log In"
                          : step === TOTAL_STEPS
                            ? selectedSignupProvider
                              ? `Create with ${selectedSignupProvider.label}`
                              : "Create Account"
                            : "Continue"}
              </button>
            </div>

            {authView === "auth" && isLogin && (
              <button type="button" onClick={showForgotPassword} className="mx-auto text-sm font-bold text-gold underline-offset-4 transition hover:text-white hover:underline">
                Forgot password?
              </button>
            )}

            <p className="text-sm leading-6 text-gray-300">
              {authView !== "auth"
                ? "Password reset uses your email only."
                : isLogin
                  ? "New here? Switch to Sign Up and build your hero."
                  : "Already have an account? Switch to Log In anytime."}
            </p>
          </form>
        </section>
      </main>
    </div>
  );
}
