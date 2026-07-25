import 'package:purchases_flutter/purchases_flutter.dart';

/// Result of a purchase attempt.
///
/// The RevenueCat SDK signals purchase problems by throwing a
/// `PlatformException`, including for the extremely common "user tapped
/// cancel" case. Translating that into a sealed result at the repository
/// boundary means callers get an exhaustive `switch` instead of having to
/// remember which error code means "not actually an error".
sealed class PurchaseOutcome {
  const PurchaseOutcome();
}

final class PurchaseSuccess extends PurchaseOutcome {
  const PurchaseSuccess(this.customerInfo, this.transaction);

  final CustomerInfo customerInfo;
  final StoreTransaction transaction;
}

/// The customer backed out of the store sheet. Never show an error for this.
final class PurchaseCancelled extends PurchaseOutcome {
  const PurchaseCancelled();
}

/// Awaiting an out-of-band payment: Play Store slow-payment methods, or
/// Ask to Buy / SCA on the App Store. The entitlement is granted later via
/// the customer info listener, so tell the customer to expect a wait.
final class PurchasePending extends PurchaseOutcome {
  const PurchasePending();
}

final class PurchaseFailure extends PurchaseOutcome {
  const PurchaseFailure(this.code, this.message);

  final PurchasesErrorCode code;

  /// Message safe to show to the customer.
  final String message;

  /// True when the products aren't reachable — usually a dashboard/store
  /// configuration problem rather than anything the customer can fix.
  bool get isConfigurationProblem =>
      code == PurchasesErrorCode.configurationError ||
      code == PurchasesErrorCode.invalidCredentialsError ||
      code == PurchasesErrorCode.productNotAvailableForPurchaseError;
}

/// Result of restoring previous purchases.
sealed class RestoreOutcome {
  const RestoreOutcome();
}

final class RestoreSuccess extends RestoreOutcome {
  const RestoreSuccess(this.customerInfo);

  final CustomerInfo customerInfo;
}

final class RestoreFailure extends RestoreOutcome {
  const RestoreFailure(this.code, this.message);

  final PurchasesErrorCode code;
  final String message;
}
