import UIKit
@preconcurrency import WebKit

private let siteURL = URL(string: "https://mnalwahsh.com")!
private let siteHost = "mnalwahsh.com"

// Mirrors android/app/src/main/java/com/mnalwahsh/twa/MainActivity.kt as
// closely as the two platforms allow: same site, same splash/offline
// screens, same "keep our own pages inside the app, everything else opens
// externally" rule, and the same billing-bridge injection pattern (see
// StoreKitBillingBridge.swift).
final class MainViewController: UIViewController, WKNavigationDelegate {

    private var webView: WKWebView!
    private var splashView: UIView!
    private var offlineView: UIView!
    private var billingBridge: StoreKitBillingBridge!
    private var hasLoadedOnce = false

    override var supportedInterfaceOrientations: UIInterfaceOrientationMask {
        // Matches android:screenOrientation="userLandscape" — the game's
        // UI is landscape-only.
        return .landscape
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0x0A / 255, green: 0, blue: 0, alpha: 1) // manifest.json background_color

        setupWebView()
        setupSplash()
        setupOffline()

        webView.load(URLRequest(url: siteURL))
    }

    private func setupWebView() {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        let contentController = WKUserContentController()
        billingBridge = StoreKitBillingBridge()
        contentController.add(billingBridge, name: "WebkitBillingNative")
        config.userContentController = contentController

        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.navigationDelegate = self
        webView.scrollView.bounces = false
        // iOS's native equivalent of Android's hardware back button —
        // an edge swipe steps back through in-app navigation history.
        webView.allowsBackForwardNavigationGestures = true
        billingBridge.webView = webView

        view.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])
    }

    private func setupSplash() {
        splashView = UIView(frame: view.bounds)
        splashView.translatesAutoresizingMaskIntoConstraints = false
        splashView.backgroundColor = UIColor(red: 0x0A / 255, green: 0, blue: 0, alpha: 1)

        let spinner = UIActivityIndicatorView(style: .large)
        spinner.color = UIColor(red: 0xCC / 255, green: 0, blue: 0, alpha: 1)
        spinner.translatesAutoresizingMaskIntoConstraints = false
        spinner.startAnimating()
        splashView.addSubview(spinner)

        view.addSubview(splashView)
        NSLayoutConstraint.activate([
            splashView.topAnchor.constraint(equalTo: view.topAnchor),
            splashView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            splashView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            splashView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            spinner.centerXAnchor.constraint(equalTo: splashView.centerXAnchor),
            spinner.centerYAnchor.constraint(equalTo: splashView.centerYAnchor),
        ])
    }

    private func setupOffline() {
        offlineView = UIView(frame: view.bounds)
        offlineView.translatesAutoresizingMaskIntoConstraints = false
        offlineView.backgroundColor = UIColor(red: 0x0A / 255, green: 0, blue: 0, alpha: 1)
        offlineView.isHidden = true

        let label = UILabel()
        label.text = "تعذّر الاتصال — تحقق من الإنترنت"
        label.textColor = UIColor(red: 1, green: 0.9, blue: 0.9, alpha: 1)
        label.font = .systemFont(ofSize: 16, weight: .semibold)
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false

        let retryButton = UIButton(type: .system)
        retryButton.setTitle("إعادة المحاولة", for: .normal)
        retryButton.setTitleColor(UIColor(red: 0x2A / 255, green: 0, blue: 0, alpha: 1), for: .normal)
        retryButton.backgroundColor = UIColor(red: 1, green: 0.84, blue: 0, alpha: 1) // #FFD700
        retryButton.layer.cornerRadius = 12
        retryButton.titleLabel?.font = .boldSystemFont(ofSize: 15)
        retryButton.translatesAutoresizingMaskIntoConstraints = false
        retryButton.addTarget(self, action: #selector(retryTapped), for: .touchUpInside)

        offlineView.addSubview(label)
        offlineView.addSubview(retryButton)
        view.addSubview(offlineView)

        NSLayoutConstraint.activate([
            offlineView.topAnchor.constraint(equalTo: view.topAnchor),
            offlineView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            offlineView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            offlineView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            label.centerXAnchor.constraint(equalTo: offlineView.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: offlineView.centerYAnchor, constant: -30),
            label.leadingAnchor.constraint(greaterThanOrEqualTo: offlineView.leadingAnchor, constant: 24),
            label.trailingAnchor.constraint(lessThanOrEqualTo: offlineView.trailingAnchor, constant: -24),
            retryButton.topAnchor.constraint(equalTo: label.bottomAnchor, constant: 16),
            retryButton.centerXAnchor.constraint(equalTo: offlineView.centerXAnchor),
            retryButton.widthAnchor.constraint(equalToConstant: 180),
            retryButton.heightAnchor.constraint(equalToConstant: 46),
        ])
    }

    @objc private func retryTapped() {
        offlineView.isHidden = true
        if hasLoadedOnce {
            webView.reload()
        } else {
            webView.load(URLRequest(url: siteURL))
        }
    }

    private func isOwnSite(_ host: String?) -> Bool {
        guard let host else { return false }
        return host == siteHost || host.hasSuffix(".\(siteHost)")
    }

    // MARK: - WKNavigationDelegate

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.allow)
            return
        }
        if isOwnSite(url.host) {
            decisionHandler(.allow)
        } else {
            decisionHandler(.cancel)
            UIApplication.shared.open(url)
        }
    }

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        if isOwnSite(webView.url?.host) {
            offlineView.isHidden = true
        }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        billingBridge.injectBridgeScript(into: webView)
        hasLoadedOnce = true
        splashView.isHidden = true
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        showOfflineIfMainFrame(error)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        showOfflineIfMainFrame(error)
    }

    private func showOfflineIfMainFrame(_ error: Error) {
        let nsError = error as NSError
        // Ignore "navigation cancelled" (-999), which fires for every
        // redirect/cancelled load and isn't a real connectivity failure.
        if nsError.code == NSURLErrorCancelled { return }
        splashView.isHidden = true
        offlineView.isHidden = false
    }
}
