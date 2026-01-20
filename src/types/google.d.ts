declare namespace google {
  namespace accounts {
    namespace oauth2 {
      interface TokenClient {
        requestAccessToken(options?: { prompt?: string }): void;
      }

      interface TokenResponse {
        access_token: string;
        expires_in: number;
        token_type: string;
        scope: string;
        error?: string;
        error_description?: string;
      }

      function initTokenClient(config: {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
        error_callback?: (error: { type: string; message: string }) => void;
      }): TokenClient;

      function revoke(token: string, callback: () => void): void;
    }
  }
}

declare namespace gapi {
  function load(api: string, callback: () => void): void;

  namespace client {
    function init(config: {
      apiKey: string;
      discoveryDocs: string[];
    }): Promise<void>;

    function setToken(token: { access_token: string }): void;
    function getToken(): { access_token: string } | null;
  }
}
