import { assertEquals } from 'jsr:@std/assert@1';

import { mapRevenueCatEventType } from './posthog.ts';

Deno.test('maps RevenueCat webhook types to PostHog events', () => {
  assertEquals(mapRevenueCatEventType('INITIAL_PURCHASE'), 'subscription_started');
  assertEquals(mapRevenueCatEventType('RENEWAL'), 'subscription_renewed');
  assertEquals(mapRevenueCatEventType('CANCELLATION'), 'subscription_cancelled');
  assertEquals(mapRevenueCatEventType('UNCANCELLATION'), 'subscription_uncancelled');
  assertEquals(mapRevenueCatEventType('EXPIRATION'), 'subscription_expired');
  assertEquals(mapRevenueCatEventType('BILLING_ISSUE'), 'subscription_billing_issue');
  assertEquals(
    mapRevenueCatEventType('PRODUCT_CHANGE'),
    'subscription_product_changed',
  );
});

Deno.test('ignores unmapped or missing types', () => {
  assertEquals(mapRevenueCatEventType('TRANSFER'), null);
  assertEquals(mapRevenueCatEventType(undefined), null);
});
