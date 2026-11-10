import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

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

class _ShellState extends State<Shell> {
  InAppWebViewController? ctrl;
  bool failed = false;

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
