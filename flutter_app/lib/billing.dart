import 'dart:async';
import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:in_app_purchase_android/in_app_purchase_android.dart';

// Abonnement RobotKids via Google Play Billing.
// Deux produits d'abonnement à créer dans la Play Console (un plan de base chacun, avec une offre d'essai gratuit de 7 jours) :
//   robotkids_monthly : 3,99 € / mois      robotkids_yearly : 29,99 € / an
const String kMonthly = 'robotkids_monthly';
const String kYearly = 'robotkids_yearly';
const Set<String> kProductIds = {kMonthly, kYearly};

class Billing {
  Billing._();
  static final Billing i = Billing._();

  final InAppPurchase _iap = InAppPurchase.instance;
  StreamSubscription<List<PurchaseDetails>>? _sub;
  void Function()? onChange; // prévient la page web (elle relit l'état)

  bool available = false, checked = false, active = false, pending = false;
  String? error;
  String debug = ''; // diagnostic lisible : ce que Google Play a répondu (affiché dans l'espace parents, écrit dans le journal)
  void _dbg(String s) {
    debug = s;
    // ignore: avoid_print
    print('RKBILL $s');
  }
  final Map<String, Map<String, Object>> plans = {};
  final Map<String, GooglePlayProductDetails> _details = {};

  Map<String, Object?> status() => {
        'available': available,
        'checked': checked,
        'active': active,
        'pending': pending,
        'error': error,
        'debug': debug,
        'plans': plans,
      };

  Future<void> init() async {
    _sub ??= _iap.purchaseStream.listen(_onPurchases, onError: (Object e) {
      error = 'stream';
      onChange?.call();
    });
    try {
      available = await _iap.isAvailable();
    } catch (e) {
      available = false;
      _dbg('isAvailable: $e');
    }
    if (!available) {
      if (debug.isEmpty) _dbg('Google Play Billing indisponible');
      error = 'unavailable';
      checked = true;
      onChange?.call();
      return;
    }
    await refresh();
  }

  // relit les produits (prix) et les achats existants : marche aussi hors ligne (cache de Google Play)
  Future<void> refresh() async {
    if (!available) return;
    try {
      await _loadPlans();
    } catch (e) {
      _dbg('produits: exception $e');
    }
    try {
      final add = _iap.getPlatformAddition<InAppPurchaseAndroidPlatformAddition>();
      final r = await add.queryPastPurchases();
      if (r.error != null) {
        error = 'query';
      } else {
        error = null;
        await _apply(r.pastPurchases);
      }
    } catch (_) {
      error = 'query';
    }
    checked = true;
    onChange?.call();
  }

  Future<void> _loadPlans() async {
    final res = await _iap.queryProductDetails(kProductIds);
    final seen = <String>[];
    final best = <String, GooglePlayProductDetails>{};
    final bestTrial = <String, bool>{};
    for (final d in res.productDetails) {
      if (d is! GooglePlayProductDetails) {
        seen.add('${d.id}:type?');
        continue;
      }
      final offers = d.productDetails.subscriptionOfferDetails;
      final idx = d.subscriptionIndex;
      seen.add('${d.id}:${d.productDetails.productType.name}/offres=${offers?.length}/i=$idx');
      if (offers == null || idx == null || idx >= offers.length) continue;
      final phases = offers[idx].pricingPhases;
      final trial = phases.isNotEmpty && phases.first.priceAmountMicros == 0;
      if (!best.containsKey(d.id) || (trial && bestTrial[d.id] != true)) {
        best[d.id] = d;
        bestTrial[d.id] = trial;
      }
    }
    _dbg('trouvés=[${seen.join(', ')}] introuvables=${res.notFoundIDs} erreur=${res.error == null ? '-' : '${res.error!.code}: ${res.error!.message}'} retenus=${best.keys.toList()}');
    plans.clear();
    _details.clear();
    best.forEach((id, d) {
      final offer = d.productDetails.subscriptionOfferDetails![d.subscriptionIndex!];
      final phases = offer.pricingPhases;
      _details[id] = d;
      plans[id] = {
        'price': phases.last.formattedPrice,
        'period': phases.last.billingPeriod,
        'trial': bestTrial[id] == true,
      };
    });
  }

  Future<bool> buy(String id) async {
    final d = _details[id];
    if (d == null) {
      await refresh();
    }
    final det = _details[id];
    if (det == null) return false;
    final offer = det.productDetails.subscriptionOfferDetails![det.subscriptionIndex!];
    try {
      return await _iap.buyNonConsumable(
        purchaseParam: GooglePlayPurchaseParam(productDetails: det, offerToken: offer.offerIdToken),
      );
    } catch (_) {
      return false;
    }
  }

  Future<void> _onPurchases(List<PurchaseDetails> list) async {
    await _apply(list);
    onChange?.call();
  }

  Future<void> _apply(List<PurchaseDetails> list) async {
    var any = false, wait = false;
    for (final p in list) {
      if (!kProductIds.contains(p.productID)) continue;
      switch (p.status) {
        case PurchaseStatus.purchased:
        case PurchaseStatus.restored:
          any = true;
          break;
        case PurchaseStatus.pending:
          wait = true;
          break;
        case PurchaseStatus.error:
          error = 'purchase';
          break;
        case PurchaseStatus.canceled:
          break;
      }
      // Google exige l'accusé de réception de l'achat sous 3 jours, sinon il est remboursé
      if (p.pendingCompletePurchase) {
        try {
          await _iap.completePurchase(p);
        } catch (_) {}
      }
    }
    active = any;
    pending = wait && !any;
  }
}
