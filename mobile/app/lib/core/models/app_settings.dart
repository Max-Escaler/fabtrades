/// Which marketplace prices to show.
enum PriceSource {
  tcgplayer('TCGplayer', 'USD', '\$'),
  cardmarket('CardMarket', 'EUR', '€');

  const PriceSource(this.label, this.currencyCode, this.symbol);
  final String label;
  final String currencyCode;
  final String symbol;
}

/// Which price point within a source to use as the canonical value.
enum PriceType {
  market('Market'),
  low('Low');

  const PriceType(this.label);
  final String label;
}

class AppSettings {
  final PriceSource source;
  final PriceType type;

  const AppSettings({
    this.source = PriceSource.tcgplayer,
    this.type = PriceType.market,
  });

  AppSettings copyWith({PriceSource? source, PriceType? type}) => AppSettings(
        source: source ?? this.source,
        type: type ?? this.type,
      );

  Map<String, dynamic> toJson() => {
        'source': source.name,
        'type': type.name,
      };

  factory AppSettings.fromJson(Map<String, dynamic> json) => AppSettings(
        source: PriceSource.values.firstWhere(
          (e) => e.name == json['source'],
          orElse: () => PriceSource.tcgplayer,
        ),
        type: PriceType.values.firstWhere(
          (e) => e.name == json['type'],
          orElse: () => PriceType.market,
        ),
      );
}
