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

  try {
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
  } catch (error, stack) {
    // Errors thrown before runApp leave a blank FlutterView (white screen) when
    // launched from Xcode. Surface them so a missing --dart-define is obvious.
    runApp(_BootstrapErrorApp(error: error, stack: stack));
  }
}

class _BootstrapErrorApp extends StatelessWidget {
  const _BootstrapErrorApp({required this.error, required this.stack});

  final Object error;
  final StackTrace stack;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: SelectableText(
              'FAB Trades failed to start.\n\n$error\n\n$stack',
              style: const TextStyle(
                fontFamily: 'Courier',
                fontSize: 13,
                color: Color(0xFFB71C1C),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
