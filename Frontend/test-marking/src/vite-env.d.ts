/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_APP_NAME?: string;
	readonly VITE_API_BASE_URL?: string;
	readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

interface GoogleCredentialResponse {
	credential?: string;
	select_by?: string;
}

interface GooglePromptMomentNotification {
	isNotDisplayed?: () => boolean;
	isSkippedMoment?: () => boolean;
	isDismissedMoment?: () => boolean;
	getNotDisplayedReason?: () => string;
	getSkippedReason?: () => string;
	getDismissedReason?: () => string;
}

interface GoogleIdConfiguration {
	client_id: string;
	callback: (response: GoogleCredentialResponse) => void;
	auto_select?: boolean;
	cancel_on_tap_outside?: boolean;
	use_fedcm_for_prompt?: boolean;
}

interface GoogleButtonConfiguration {
	type?: 'standard' | 'icon';
	theme?: 'outline' | 'filled_blue' | 'filled_black';
	size?: 'large' | 'medium' | 'small';
	text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
	shape?: 'rectangular' | 'pill' | 'circle' | 'square';
	logo_alignment?: 'left' | 'center';
	width?: string | number;
}

interface GoogleAccountsId {
	initialize: (config: GoogleIdConfiguration) => void;
	prompt: (listener?: (notification: GooglePromptMomentNotification) => void) => void;
	renderButton: (parent: HTMLElement, options: GoogleButtonConfiguration) => void;
}

interface Window {
	google?: {
		accounts: {
			id: GoogleAccountsId;
		};
	};
}
