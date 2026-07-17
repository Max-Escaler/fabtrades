/// Which marketplace prices to show.
enum PriceSource {
  tcgplayer('TCGplayer', 'USD', '\$'),
  cardmarket('CardMarket', 'EUR', '€');

  const PriceSource(this.label, this.currencyCode, this.symbol);
  final String label;
  final String currencyCode;
  final String symbol;
}

/// App appearance preference.
enum AppThemeMode {
  light('Light'),
  dark('Dark');

  const AppThemeMode(this.label);
  final String label;
}

class AppSettings {
  final PriceSource source;
  final AppThemeMode themeMode;

  const AppSettings({
    this.source = PriceSource.tcgplayer,
    this.themeMode = AppThemeMode.light,
  });

  AppSettings copyWith({
    PriceSource? source,
    AppThemeMode? themeMode,
  }) =>
      AppSettings(
        source: source ?? this.source,
        themeMode: themeMode ?? this.themeMode,
      );

  Map<String, dynamic> toJson() => {
        'source': source.name,
        'themeMode': themeMode.name,
      };

  factory AppSettings.fromJson(Map<String, dynamic> json) => AppSettings(
        source: PriceSource.values.firstWhere(
          (e) => e.name == json['source'],
          orElse: () => PriceSource.tcgplayer,
        ),
        themeMode: AppThemeMode.values.firstWhere(
          (e) => e.name == json['themeMode'],
          orElse: () => AppThemeMode.light,
        ),
      );
}
