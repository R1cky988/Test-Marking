const GOOGLE_GSI_SCRIPT_ID = 'google-identity-services';
const GOOGLE_GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let googleScriptPromise: Promise<void> | null = null;

function googlePromptError(notification: GooglePromptMomentNotification) {
  if (notification.isNotDisplayed?.()) {
    const reason = notification.getNotDisplayedReason?.();
    return new Error(
      `Google Sign-In could not be displayed${reason ? ` (${reason})` : ""}. ` +
        "Check VITE_GOOGLE_CLIENT_ID and Authorized JavaScript origins in Google Cloud Console."
    );
  }

  if (notification.isSkippedMoment?.()) {
    const reason = notification.getSkippedReason?.();
    return new Error(
      `Google Sign-In was skipped${reason ? ` (${reason})` : ""}. ` +
        "Try another Google account or check the browser's third-party sign-in settings."
    );
  }

  if (notification.isDismissedMoment?.()) {
    const reason = notification.getDismissedReason?.();
    return new Error(
      `Google Sign-In was dismissed${reason ? ` (${reason})` : ""}.`
    );
  }

  return null;
}

export function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (googleScriptPromise) {
    return googleScriptPromise;
  }

  googleScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_GSI_SCRIPT_ID) as HTMLScriptElement | null;

    const handleLoaded = () => {
      if (window.google?.accounts?.id) {
        resolve(undefined);
        return;
      }
      reject(new Error('Unable to initialize Google Identity Services.'));
    };

    const handleError = () => {
      reject(new Error('Unable to load Google Identity Services.'));
    };

    if (existingScript) {
      existingScript.addEventListener('load', handleLoaded, { once: true });
      existingScript.addEventListener('error', handleError, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_GSI_SCRIPT_ID;
    script.src = GOOGLE_GSI_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', handleLoaded, { once: true });
    script.addEventListener('error', handleError, { once: true });

    document.head.appendChild(script);
  }).finally(() => {
    if (!window.google?.accounts?.id) {
      googleScriptPromise = null;
    }
  });

  return googleScriptPromise;
}

export async function requestGoogleIdToken(
  clientId: string,
  timeoutMs = 15000
): Promise<string> {
  if (!clientId.trim()) {
    throw new Error('Missing VITE_GOOGLE_CLIENT_ID for Google Sign-In.');
  }

  await loadGoogleIdentityScript();

  if (!window.google?.accounts?.id) {
    throw new Error('Google Sign-In is not ready. Please try again.');
  }

  return new Promise((resolve, reject) => {
    let settled = false;

    const finish = (next: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timeoutId);
      next();
    };

    const timeoutId = window.setTimeout(() => {
      finish(() => {
        reject(
          new Error(
            'No response from Google Sign-In. Check Authorized JavaScript origins in Google Cloud Console (e.g., http://localhost:5173).'
          )
        );
      });
    }, timeoutMs);

    window.google.accounts.id.initialize({
      client_id: clientId,
      auto_select: false,
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: false,
      callback: (response: GoogleCredentialResponse) => {
        const token = response.credential?.trim();
        if (!token) {
          finish(() => {
            reject(new Error('Google did not return a valid ID token.'));
          });
          return;
        }

        finish(() => {
          resolve(token);
        });
      },
    });

    window.google.accounts.id.prompt((notification) => {
      const error = googlePromptError(notification);
      if (!error) return;
      finish(() => reject(error));
    });
  });
}

export function parseGoogleIdTokenProfile(token: string): {
  email?: string;
  fullName?: string;
} {
  try {
    const payload = token.split(".")[1];
    if (!payload) return {};
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const binary = window.atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const decoded = JSON.parse(new TextDecoder().decode(bytes));

    return {
      email: typeof decoded.email === "string" ? decoded.email : undefined,
      fullName: typeof decoded.name === "string" ? decoded.name : undefined,
    };
  } catch {
    return {};
  }
}
