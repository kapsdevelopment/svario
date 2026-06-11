class AppConfig {
  const AppConfig({
    required this.supabaseUrl,
    required this.supabasePublishableKey,
  });

  factory AppConfig.fromEnvironment() {
    const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
    const supabasePublishableKey = String.fromEnvironment(
      'SUPABASE_PUBLISHABLE_KEY',
    );
    const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

    return AppConfig(
      supabaseUrl: _blankToNull(supabaseUrl),
      supabasePublishableKey: _blankToNull(supabasePublishableKey) ??
          _blankToNull(supabaseAnonKey),
    );
  }

  final String? supabaseUrl;
  final String? supabasePublishableKey;

  bool get hasSupabaseCredentials {
    return supabaseUrl != null && supabasePublishableKey != null;
  }

  static String? _blankToNull(String value) {
    final trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }
}
