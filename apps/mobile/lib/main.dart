import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app/app.dart';
import 'core/config/supabase_config.dart';
import 'core/data/purchases_repository.dart';
import 'core/providers.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  SupabaseConfig.assertConfigured();
  await Supabase.initialize(
    url: SupabaseConfig.url,
    publishableKey: SupabaseConfig.publishableKey,
  );
  final prefs = await SharedPreferences.getInstance();

  // RevenueCat must be configured before any entitlement is read. This never
  // throws: a build without a usable API key just runs without subscriptions.
  final purchases = PurchasesRepository();
  await purchases.configure();

  runApp(
    ProviderScope(
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
        purchasesRepositoryProvider.overrideWithValue(purchases),
      ],
      child: const FabTradesApp(),
    ),
  );
}
