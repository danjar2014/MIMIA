import 'dart:async';
import 'dart:io' show Platform;
import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:in_app_purchase_android/in_app_purchase_android.dart';

// Achat unique RobotKids (4,99 €, sans abonnement) : Google Play Billing sur Android, App Store (StoreKit 2) sur iPhone.
// Un seul produit « non consommable » (produit intégré, pas un abonnement), même identifiant dans la Play Console
// et dans App Store Connect :  robotkids_unlock : 4,99 € une fois pour toutes.
// Le prix affiché vient de la boutique : il se change dans la Play Console / App Store Connect.
const String kUnlock = 'robotkids_unlock';
const Set<String> kProductIds = {kUnlock};

class Billing {
  Billing._();
  static final Billing i = Billing._();

  final InAppPurchase _iap = InAppPurchase.instance;
  final bool ios = Platform.isIOS;
  StreamSubscription<List<PurchaseDetails>>? _sub;
  void Function()? onChange; // prévient la page web (elle relit l'état)

  bool available = false, checked = false, active = false, pending = false;
  String? error;
  String debug = ''; // diagnostic lisible : ce que la boutique a répondu (affiché dans l'espace parents, écrit dans le journal)
  void _dbg(String s) {
    debug = s;
    // ignore: avoid_print
    print('RKBILL $s');
  }

  final Map<String, Map<String, Object?>> plans = {};
  final Map<String, ProductDetails> _details = {};

  // iPhone : pendant une relecture des achats, on note si l'achat a été vu
  bool _restoring = false, _restoreSeen = false;

  Map<String, Object?> status() => {
        'store': ios ? 'apple' : 'google',
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
      if (debug.isEmpty) _dbg(ios ? 'App Store indisponible' : 'Google Play Billing indisponible');
      error = 'unavailable';
      checked = true;
      onChange?.call();
      return;
    }
    await refresh();
  }

  // relit les produits (prix) et les achats existants
  Future<void> refresh() async {
    if (!available) return;
    try {
      await _loadPlans();
    } catch (e) {
      _dbg('produits: exception $e');
    }
    if (ios) {
      await _refreshApple();
    } else {
      await _refreshGoogle();
    }
    checked = true;
    onChange?.call();
  }

  Future<void> _refreshGoogle() async {
    try {
      final add = _iap.getPlatformAddition<InAppPurchaseAndroidPlatformAddition>();
      final r = await add.queryPastPurchases();
      if (r.error != null) {
        error = 'query';
      } else {
        error = null;
        await _apply(r.pastPurchases, replace: true);
      }
    } catch (_) {
      error = 'query';
    }
  }

  // StoreKit 2 : restorePurchases parcourt les droits en cours (Transaction.currentEntitlements),
  // sans demander de mot de passe ; chacun arrive dans purchaseStream avec l'état « restored ».
  Future<void> _refreshApple() async {
    _restoring = true;
    _restoreSeen = false;
    try {
      await _iap.restorePurchases();
      await Future<void>.delayed(const Duration(milliseconds: 900)); // laisse arriver les derniers achats du flux
      error = null;
      active = _restoreSeen;
      if (active) pending = false;
    } catch (e) {
      error = 'query';
      _dbg('restore: $e');
    }
    _restoring = false;
  }

  Future<void> _loadPlans() async {
    final res = await _iap.queryProductDetails(kProductIds);
    plans.clear();
    _details.clear();
    final seen = <String>[];
    for (final d in res.productDetails) {
      seen.add(d.id);
      _details[d.id] = d;
      plans[d.id] = {'price': d.price, 'trial': false};
    }
    _dbg('trouvés=[${seen.join(', ')}] introuvables=${res.notFoundIDs} erreur=${res.error == null ? '-' : '${res.error!.code}: ${res.error!.message}'} retenus=${_details.keys.toList()}');
  }

  Future<bool> buy(String id) async {
    if (_details[id] == null) await refresh();
    final det = _details[id];
    if (det == null) return false;
    try {
      return await _iap.buyNonConsumable(purchaseParam: PurchaseParam(productDetails: det));
    } catch (e) {
      _dbg('achat: $e');
      return false;
    }
  }

  Future<void> _onPurchases(List<PurchaseDetails> list) async {
    // Android : la liste reçue décrit les achats en cours ; iPhone : le flux n'apporte que des nouveautés
    // (achat, relecture) ; un achat remboursé se voit à la relecture (refresh).
    await _apply(list, replace: !ios);
    if (!_restoring) onChange?.call();
  }

  Future<void> _apply(List<PurchaseDetails> list, {required bool replace}) async {
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
      // Google exige l'accusé de réception sous 3 jours (sinon remboursement) ; Apple demande de « terminer » la transaction
      if (p.pendingCompletePurchase) {
        try {
          await _iap.completePurchase(p);
        } catch (_) {}
      }
    }
    if (_restoring && any) _restoreSeen = true;
    if (replace) {
      active = any;
      pending = wait && !any;
    } else {
      if (any) {
        active = true;
        error = null;
      }
      pending = wait && !active;
    }
  }
}
