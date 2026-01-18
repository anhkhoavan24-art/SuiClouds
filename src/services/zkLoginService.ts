// Lightweight stub implementations so imports succeed in the app.
// These implement minimal behavior used by the `AuthContext`.

export const initiateGoogleLogin = async () => {
	// In this demo app we don't perform a real OAuth flow.
	// A real implementation would redirect to the OAuth provider here.
	throw new Error('Google login is not implemented in this demo.');
};

export const extractJWTFromUrl = (): string | null => {
	try {
		const params = new URLSearchParams(window.location.search);
		return params.get('zk_jwt');
	} catch (e) {
		return null;
	}
};

export const decodeJWT = (jwt: string): any => {
	try {
		const parts = jwt.split('.');
		if (parts.length < 2) return null;
		const payload = JSON.parse(atob(parts[1]));
		return payload;
	} catch (e) {
		return null;
	}
};

export const validateNonce = (_payload: any): boolean => {
	// Demo always returns true. Replace with real nonce validation.
	return true;
};

export const clearZkLoginSession = () => {
	sessionStorage.removeItem('zklogin_jwt');
	localStorage.removeItem('zklogin_user');
};