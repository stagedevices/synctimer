/users/{uid}/profile        — single document per user’s profile
/usernames/{username}       — handle → uid mapping for uniqueness
/users/{uid}/files          — parsed files the user has uploaded
/users/{uid}/sent           — files the user’s sent to peers
/users/{uid}/devices        — linked device records
/users/{uid}/tags           — ensemble‐tag subscriptions
/users/{uid}/peers          — their contact list
/users/{uid}/linkTokens     — one‐time tokens for pairing
/parseLogs                  — top‐level parse logs from Cloud Functions
