import Foundation
import AuthenticationServices

/// Spotify OAuth Configuration (fetched from backend)
public struct SpotifyOAuthConfig: Codable {
    public let client_id: String
    public let redirect_uri: String
    public let scopes: String

    enum CodingKeys: String, CodingKey {
        case client_id = "client_id"
        case redirect_uri = "redirect_uri"
        case scopes = "scopes"
    }
}

/// Spotify Token Response from backend
struct SpotifyTokenResponse: Codable {
    let access_token: String
    let refresh_token: String?
    let expires_in: Int
    let token_type: String

    enum CodingKeys: String, CodingKey {
        case access_token = "access_token"
        case refresh_token = "refresh_token"
        case expires_in = "expires_in"
        case token_type = "token_type"
    }
}

/// Secure Spotify OAuth Handler using backend server
@MainActor
public final class SpotifyAuth: NSObject, ObservableObject {
    @Published public var isAuthenticated = false
    @Published public var accessToken: String?
    @Published public var userEmail: String?
    @Published public var errorMessage: String?

    public var refreshToken: String? {
        didSet {
            if let token = refreshToken {
                KeychainHelper.save(token, forKey: "spotify_refresh_token")
            }
        }
    }

    private var tokenExpiry: Date?
    private let config: SpotifyOAuthConfig
    private let backendURL: URL
    private let keychainService = "com.example.ProPlayer.Spotify"

    public init(backendURL: URL = URL(string: "https://proplayer-backend.onrender.com")!) {
        self.backendURL = backendURL
        self.config = SpotifyOAuthConfig(
            client_id: "",
            redirect_uri: "",
            scopes: ""
        )
        super.init()
        loadKeychain()
        Task {
            await fetchOAuthConfig()
        }
    }

    /// Fetch OAuth configuration from backend
    private func fetchOAuthConfig() async {
        let configURL = backendURL.appendingPathComponent("auth/spotify/config")
        do {
            let (data, _) = try await URLSession.shared.data(from: configURL)
            let config = try JSONDecoder().decode(SpotifyOAuthConfig.self, from: data)
            self.config = config
        } catch {
            print("Failed to fetch OAuth config: \(error)")
            errorMessage = "Failed to load Spotify configuration"
        }
    }

    /// Initiate Spotify authentication
    public func authenticate() {
        guard !config.client_id.isEmpty else {
            errorMessage = "Spotify config not loaded"
            return
        }

        let state = UUID().uuidString
        let authURL = URL(string: "https://accounts.spotify.com/authorize")!
        var components = URLComponents(url: authURL, resolvingAgainstBaseURL: false)!

        components.queryItems = [
            URLQueryItem(name: "client_id", value: config.client_id),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "redirect_uri", value: config.redirect_uri),
            URLQueryItem(name: "scope", value: config.scopes),
            URLQueryItem(name: "state", value: state)
        ]

        guard let authorizeURL = components.url else {
            errorMessage = "Failed to construct authorization URL"
            return
        }

        // Use ASWebAuthenticationSession for secure browser-based OAuth
        let authSession = ASWebAuthenticationSession(
            url: authorizeURL,
            callbackURLScheme: "proplayer"
        ) { [weak self] callbackURL, error in
            Task {
                await self?.handleAuthCallback(callbackURL, error)
            }
        }

        authSession.presentationContextProvider = self
        authSession.prefersEphemeralWebBrowserSession = false

        if !authSession.start() {
            errorMessage = "Failed to start authentication session"
        }
    }

    /// Handle OAuth callback from authentication session
    private func handleAuthCallback(_ callbackURL: URL?, _ error: Error?) async {
        guard error == nil else {
            errorMessage = "Authentication failed: \(error?.localizedDescription ?? "Unknown error")"
            return
        }

        guard let callbackURL = callbackURL,
              let components = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false),
              let code = components.queryItems?.first(where: { $0.name == "code" })?.value else {
            errorMessage = "No authorization code received"
            return
        }

        // Exchange code for tokens via backend
        await exchangeCodeForToken(code)
    }

    /// Exchange authorization code for access token (via backend)
    private func exchangeCodeForToken(_ code: String) async {
        let tokenURL = backendURL.appendingPathComponent("auth/spotify/token")
        var request = URLRequest(url: tokenURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = ["code": code, "state": UUID().uuidString]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        do {
            let (data, _) = try await URLSession.shared.data(for: request)
            let tokenResponse = try JSONDecoder().decode(SpotifyTokenResponse.self, from: data)

            accessToken = tokenResponse.access_token
            refreshToken = tokenResponse.refresh_token
            tokenExpiry = Date().addingTimeInterval(TimeInterval(tokenResponse.expires_in))
            isAuthenticated = true
            errorMessage = nil

            // Fetch user info
            await fetchUserInfo()
        } catch {
            print("Token exchange failed: \(error)")
            errorMessage = "Failed to authenticate: \(error.localizedDescription)"
            isAuthenticated = false
        }
    }

    /// Refresh access token using refresh token
    public func refreshAccessToken() async {
        guard let refreshToken = refreshToken else {
            errorMessage = "No refresh token available"
            return
        }

        let refreshURL = backendURL.appendingPathComponent("auth/spotify/refresh")
        var request = URLRequest(url: refreshURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = ["refresh_token": refreshToken]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        do {
            let (data, _) = try await URLSession.shared.data(for: request)
            let tokenResponse = try JSONDecoder().decode(SpotifyTokenResponse.self, from: data)

            accessToken = tokenResponse.access_token
            tokenExpiry = Date().addingTimeInterval(TimeInterval(tokenResponse.expires_in))
            errorMessage = nil
        } catch {
            print("Token refresh failed: \(error)")
            errorMessage = "Failed to refresh token"
            isAuthenticated = false
        }
    }

    /// Fetch user info from Spotify API
    private func fetchUserInfo() async {
        guard let accessToken = accessToken else { return }

        let meURL = URL(string: "https://api.spotify.com/v1/me")!
        var request = URLRequest(url: meURL)
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        do {
            let (data, _) = try await URLSession.shared.data(for: request)
            let user = try JSONDecoder().decode(SpotifyUser.self, from: data)
            userEmail = user.email
        } catch {
            print("Failed to fetch user info: \(error)")
        }
    }

    /// Check if token needs refresh
    public func ensureValidToken() async {
        guard let expiry = tokenExpiry else { return }
        if Date() >= expiry.addingTimeInterval(-60) { // Refresh 1 minute before expiry
            await refreshAccessToken()
        }
    }

    /// Logout and clear tokens
    public func logout() {
        accessToken = nil
        refreshToken = nil
        userEmail = nil
        isAuthenticated = false
        KeychainHelper.delete(forKey: "spotify_refresh_token")
    }

    /// Load tokens from Keychain
    private func loadKeychain() {
        if let savedRefreshToken = KeychainHelper.load(forKey: "spotify_refresh_token") {
            refreshToken = savedRefreshToken
            isAuthenticated = true
        }
    }
}

// MARK: - ASWebAuthenticationPresentationContextProviding

extension SpotifyAuth: ASWebAuthenticationPresentationContextProviding {
    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        let window = NSApplication.shared.windows.first { $0.isKeyWindow } ??
                   NSApplication.shared.windows.first ??
                   NSWindow()
        return window
    }
}

// MARK: - Keychain Helper

struct KeychainHelper {
    static func save(_ value: String, forKey key: String, service: String = "com.example.ProPlayer.Spotify") {
        let data = value.data(using: .utf8)!
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]

        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }

    static func load(forKey key: String, service: String = "com.example.ProPlayer.Spotify") -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true
        ]

        var result: AnyObject?
        SecItemCopyMatching(query as CFDictionary, &result)

        if let data = result as? Data {
            return String(data: data, encoding: .utf8)
        }
        return nil
    }

    static func delete(forKey key: String, service: String = "com.example.ProPlayer.Spotify") {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(query as CFDictionary)
    }
}

// MARK: - Spotify User Model

struct SpotifyUser: Codable {
    let email: String?
    let id: String
    let display_name: String?
}
