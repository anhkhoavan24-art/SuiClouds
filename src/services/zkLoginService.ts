import { generateRandomness } from "@mysten/sui/zklogin";

// zkLogin configuration
export const ZK_LOGIN_CONFIG = {
  // These values should match your OAuth application settings
  CLIENT_ID:
    "472548068257-iubb6ejcprqoo3ee6a90g03evdsnovu1.apps.googleusercontent.com",
  REDIRECT_URI: `${window.location.origin}`,
  // Google's OAuth 2.0 endpoint
  GOOGLE_OAUTH_URL: "https://accounts.google.com/o/oauth2/v2/auth",
};

/**
 * Generate a random nonce for Google OAuth
 */
const generateGoogleNonce = (): string => {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

/**
 * Initiates the zkLogin Google authentication flow
 * Redirects user to Google's OAuth consent screen
 */
export const initiateGoogleLogin = async (): Promise<void> => {
  try {
    // Generate nonce for OAuth security
    const nonce = generateGoogleNonce();

    // Generate randomness for potential zkLogin proof (store for later)
    const randomness = generateRandomness();

    // Store randomness and nonce in sessionStorage for later use
    sessionStorage.setItem("zklogin_randomness", randomness);
    sessionStorage.setItem("zklogin_nonce", nonce);

    // Build the Google OAuth URL with OpenID Connect flow
    const params = new URLSearchParams({
      client_id: ZK_LOGIN_CONFIG.CLIENT_ID,
      redirect_uri: ZK_LOGIN_CONFIG.REDIRECT_URI,
      response_type: "id_token",
      scope: "openid profile email",
      nonce: nonce,
      prompt: "consent",
    });

    // Redirect to Google OAuth
    window.location.href = `${
      ZK_LOGIN_CONFIG.GOOGLE_OAUTH_URL
    }?${params.toString()}`;
  } catch (error) {
    console.error("Failed to initiate Google login:", error);
    throw error;
  }
};

/**
 * Extracts JWT from URL fragment after OAuth callback
 */
export const extractJWTFromUrl = (): string | null => {
  const fragment = new URLSearchParams(window.location.hash.substring(1));
  return fragment.get("id_token");
};

/**
 * Decodes JWT payload (basic parsing without verification)
 */
export const decodeJWT = (token: string): any => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid JWT format");
    }

    // Decode the payload (second part)
    const decoded = JSON.parse(atob(parts[1]));
    return decoded;
  } catch (error) {
    console.error("Failed to decode JWT:", error);
    return null;
  }
};

/**
 * Validates nonce matches JWT claim
 */
export const validateNonce = (jwtPayload: any): boolean => {
  const storedNonce = sessionStorage.getItem("zklogin_nonce");
  return !!(storedNonce && jwtPayload.nonce === storedNonce);
};

/**
 * Clears zkLogin session data
 */
export const clearZkLoginSession = (): void => {
  sessionStorage.removeItem("zklogin_randomness");
  sessionStorage.removeItem("zklogin_nonce");
  sessionStorage.removeItem("zklogin_jwt");
  localStorage.removeItem("zklogin_user");
};
