/// Remote soft/force update config from `fab_app_config`.
class AppUpdateConfig {
  const AppUpdateConfig({
    required this.latestVersion,
    this.minVersion,
    this.androidStoreUrl,
    this.iosStoreUrl,
    this.message,
  });

  final String latestVersion;
  final String? minVersion;
  final String? androidStoreUrl;
  final String? iosStoreUrl;
  final String? message;

  factory AppUpdateConfig.fromMap(Map<String, dynamic> map) {
    return AppUpdateConfig(
      latestVersion: (map['latest_version'] as String? ?? '').trim(),
      minVersion: (map['min_version'] as String?)?.trim(),
      androidStoreUrl: (map['android_store_url'] as String?)?.trim(),
      iosStoreUrl: (map['ios_store_url'] as String?)?.trim(),
      message: (map['message'] as String?)?.trim(),
    );
  }

  bool get isValid => latestVersion.isNotEmpty;
}
