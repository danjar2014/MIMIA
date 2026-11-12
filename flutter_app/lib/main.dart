import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'billing.dart';

// L'appli web (HTML/JS/CSS) est embarquée dans assets/www et servie en local :
// les modules ES, le worker du code et le stockage fonctionnent comme sur un site, sans internet.
const int kPort = 8089;
// plein écran verrouillé, demandé par l'appli web (réglage des parents) : épinglage de l'écran Android
const MethodChannel kiosk = MethodChannel('petitsrobots/kiosk');
final InAppLocalhostServer server =
    InAppLocalhostServer(documentRoot: 'assets/www', port: kPort);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  try {
    await server.start();
  } catch (_) {
    // déjà démarré (2e ouverture) : on réutilise le serveur existant
  }
  Billing.i.init(); // abonnement : lecture des achats Google Play (en tâche de fond)
  runApp(const PetitsRobotsApp());
}

class PetitsRobotsApp extends StatelessWidget {
  const PetitsRobotsApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'RobotKids',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(useMaterial3: true, colorSchemeSeed: const Color(0xFF2E8B3D)),
        home: const Shell(),
      );
}

class Shell extends StatefulWidget {
  const Shell({super.key});
  @override
  State<Shell> createState() => _ShellState();
}

class _ShellState extends State<Shell> with WidgetsBindingObserver {
  InAppWebViewController? ctrl;
  bool failed = false;
  // voix de l'appareil : la page web la commande par le canal « tts » (voir ttsbridge.js)
  final FlutterTts _tts = FlutterTts();
  int _ttsId = 0;
  // journal de la voix (lisible avec adb logcat, filtre RKTTS) : chaque phrase demandée et ce que le téléphone en a fait
  void _ttsLog(String s) {
    // ignore: avoid_print
    print('RKTTS $s');
  }

  void _ttsEnd(int id, [String? err]) {
    _ttsLog('fin $id ${err ?? 'ok'}');
    ctrl?.evaluateJavascript(source: 'window.__ttsEnd && window.__ttsEnd($id${err == null ? '' : ', "$err"'})');
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // la page web relit l'état de l'abonnement quand il change
    Billing.i.onChange = () => ctrl?.evaluateJavascript(source: 'window.__billingPush && window.__billingPush()');
    _tts.setCompletionHandler(() => _ttsEnd(_ttsId));
    _tts.setErrorHandler((msg) => _ttsEnd(_ttsId, 'synthesis-failed'));
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  // retour dans l'appli (par exemple après avoir géré l'abonnement dans Google Play) : on relit les achats
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) Billing.i.refresh();
  }

  @override
  Widget build(BuildContext context) {
    // Le bouton « retour » d'Android ne ferme pas l'appli par erreur : l'enfant utilise les boutons de l'appli.
    return PopScope(
      canPop: false,
      child: Scaffold(
        backgroundColor: Colors.white,
        body: SafeArea(
          child: failed
              ? Center(
                  child: FilledButton.icon(
                    onPressed: () {
                      setState(() => failed = false);
                      ctrl?.reload();
                    },
                    icon: const Icon(Icons.refresh, size: 40),
                    label: const Text('🔄', style: TextStyle(fontSize: 40)),
                  ),
                )
              : InAppWebView(
                  initialUrlRequest: URLRequest(url: WebUri('http://localhost:$kPort/index.html')),
                  initialSettings: InAppWebViewSettings(
                    javaScriptEnabled: true,
                    domStorageEnabled: true,
                    databaseEnabled: true,
                    mediaPlaybackRequiresUserGesture: false,
                    supportZoom: false,
                    builtInZoomControls: false,
                    disableContextMenu: true,
                    allowFileAccess: false,
                    mixedContentMode: MixedContentMode.MIXED_CONTENT_NEVER_ALLOW,
                    cacheMode: CacheMode.LOAD_NO_CACHE,
                    transparentBackground: false,
                  ),
                  onWebViewCreated: (c) {
                    ctrl = c;
                    c.addJavaScriptHandler(
                      handlerName: 'billing',
                      callback: (args) async {
                        final action = args.isNotEmpty ? '${args[0]}' : 'status';
                        if (action == 'refresh') await Billing.i.refresh();
                        if (action == 'buy' && args.length > 1) await Billing.i.buy('${args[1]}');
                        return Billing.i.status();
                      },
                    );
                    c.addJavaScriptHandler(
                      handlerName: 'tts',
                      callback: (args) async {
                        final action = args.isNotEmpty ? '${args[0]}' : '';
                        try {
                          if (action == 'stop') {
                            _ttsLog('stop');
                            await _tts.stop();
                          } else if (action == 'speak' && args.length > 2) {
                            final id = (args[1] as num).toInt();
                            final lang = args.length > 3 ? '${args[3]}' : '';
                            final rate = args.length > 4 && args[4] is num ? (args[4] as num).toDouble() : 1.0;
                            _ttsId = id;
                            final txt = '${args[2]}';
                            _ttsLog('dire $id [$lang] ${txt.length} car. : ${txt.length > 60 ? txt.substring(0, 60) : txt}');
                            if (lang.isNotEmpty) {
                              final lr = await _tts.setLanguage(lang);
                              if (lr != 1) _ttsLog('langue $lang refusée ($lr)');
                            }
                            await _tts.setSpeechRate((rate * 0.5).clamp(0.2, 1.0)); // 0,5 = vitesse normale sur Android
                            final r = await _tts.speak(txt);
                            if (r != 1) {
                              _ttsLog('refus $id ($r)');
                              _ttsEnd(id, 'synthesis-failed');
                            }
                          }
                        } catch (e) {
                          _ttsLog('exception $e');
                          if (action == 'speak' && args.length > 1 && args[1] is num) _ttsEnd((args[1] as num).toInt(), 'synthesis-failed');
                        }
                        return null;
                      },
                    );
                    c.addJavaScriptHandler(
                      handlerName: 'kiosk',
                      callback: (args) async {
                        final on = args.isNotEmpty && args[0] == true;
                        try {
                          await kiosk.invokeMethod(on ? 'start' : 'stop');
                        } catch (_) {}
                        return null;
                      },
                    );
                  },
                  // les liens externes ne sortent jamais de l'appli (enfants)
                  shouldOverrideUrlLoading: (c, action) async {
                    final host = action.request.url?.host ?? '';
                    return host == 'localhost' ? NavigationActionPolicy.ALLOW : NavigationActionPolicy.CANCEL;
                  },
                  onReceivedError: (c, req, err) {
                    if (req.isForMainFrame ?? false) setState(() => failed = true);
                  },
                  onPermissionRequest: (c, req) async =>
                      PermissionResponse(resources: req.resources, action: PermissionResponseAction.DENY),
                ),
        ),
      ),
    );
  }
}
