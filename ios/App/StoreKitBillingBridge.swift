import Foundation
import StoreKit
@preconcurrency import WebKit

// Bridges window.WebkitBillingNative (see the JS shim injected by
// injectBridgeScript, mirroring MainActivity.kt's injectBillingBridgeScript
// on Android) to real StoreKit 2 calls. Every call from JS carries a
// requestId; the result (or error) is delivered back by evaluating
// window.__iosBillingResolve(requestId, jsonResult) on the WebView, since
// WKScriptMessageHandler has no built-in way to return an async value.
//
// This only ever hands transaction ids back to the web page — granting
// happens server-side in netlify/functions/verify-apple-purchase.js after
// it verifies the transaction against Apple's own App Store Server API,
// matching how the Android bridge defers to verify-play-purchase.js.
//
// Every transaction is finished (Transaction.finish()) right after a
// purchase completes, unlike Android's Play Billing flow which must wait
// to acknowledge — Apple has no "unacknowledged purchase auto-refunds"
// rule, and finishing early is what lets a consumable (the trial pass) be
// bought again immediately. restore() re-derives ownership of
// non-consumables straight from StoreKit's own records, so finishing
// early never loses anything worth restoring.
final class StoreKitBillingBridge: NSObject, WKScriptMessageHandler {

    weak var webView: WKWebView?

    enum BridgeError: LocalizedError {
        case productNotFound, cancelled, pending, unverified, unknown

        var errorDescription: String? {
            switch self {
            case .productNotFound: return "product-not-found"
            case .cancelled: return "canceled"
            case .pending: return "purchase-pending"
            case .unverified: return "purchase-unverified"
            case .unknown: return "purchase-failed"
            }
        }
    }

    func injectBridgeScript(into webView: WKWebView) {
        let script = """
        (function() {
            if (window.WebkitBilling) return;
            var pending = {};
            window.__iosBillingResolve = function(id, result) {
                var p = pending[id];
                if (!p) return;
                delete pending[id];
                if (result && result.error) { p.reject(new Error(result.error)); } else { p.resolve(result.value); }
            };
            function call(method, args) {
                return new Promise(function(resolve, reject) {
                    var id = 'req_' + Date.now() + '_' + Math.random().toString(36).slice(2);
                    pending[id] = { resolve: resolve, reject: reject };
                    window.webkit.messageHandlers.WebkitBillingNative.postMessage({ id: id, method: method, args: args || [] });
                });
            }
            window.WebkitBilling = {
                purchase: function(sku) { return call('purchase', [sku]); },
                getDetails: function(skus) { return call('getDetails', [skus]); },
                restore: function() { return call('restore', []); }
            };
        })();
        """
        webView.evaluateJavaScript(script, completionHandler: nil)
    }

    // MARK: - WKScriptMessageHandler

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard
            let body = message.body as? [String: Any],
            let requestId = body["id"] as? String,
            let method = body["method"] as? String
        else { return }
        let args = body["args"] as? [Any] ?? []

        Task {
            do {
                let value = try await handle(method: method, args: args)
                resolve(requestId: requestId, value: value)
            } catch {
                reject(requestId: requestId, message: (error as? LocalizedError)?.errorDescription ?? "purchase-failed")
            }
        }
    }

    private func handle(method: String, args: [Any]) async throws -> Any {
        switch method {
        case "purchase":
            guard let sku = args.first as? String else { throw BridgeError.productNotFound }
            return try await purchase(sku: sku)
        case "getDetails":
            let skus = (args.first as? [Any])?.compactMap { $0 as? String } ?? []
            return try await getDetails(skus: skus)
        case "restore":
            return try await restore()
        default:
            throw BridgeError.unknown
        }
    }

    private func purchase(sku: String) async throws -> String {
        guard let product = try await Product.products(for: [sku]).first else {
            throw BridgeError.productNotFound
        }
        let result = try await product.purchase()
        switch result {
        case .success(let verification):
            let transaction = try checkVerified(verification)
            await transaction.finish()
            return String(transaction.id)
        case .userCancelled:
            throw BridgeError.cancelled
        case .pending:
            throw BridgeError.pending
        @unknown default:
            throw BridgeError.unknown
        }
    }

    private func getDetails(skus: [String]) async throws -> [[String: Any]] {
        guard !skus.isEmpty else { return [] }
        let products = try await Product.products(for: skus)
        return products.map { product in
            ["itemId": product.id, "title": product.displayName, "price": product.displayPrice]
        }
    }

    private func restore() async throws -> [[String: Any]] {
        // Pulls the latest purchase state from Apple's servers before
        // reading local records, so a purchase made on another device
        // (or before a reinstall) shows up here too.
        try? await AppStore.sync()
        var results: [[String: Any]] = []
        for await entitlement in Transaction.currentEntitlements {
            guard let transaction = try? checkVerified(entitlement) else { continue }
            results.append(["transactionId": String(transaction.id), "productId": transaction.productID])
        }
        return results
    }

    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified:
            throw BridgeError.unverified
        case .verified(let safe):
            return safe
        }
    }

    // MARK: - Resolving back into JS

    private func resolve(requestId: String, value: Any) {
        evaluate(requestId: requestId, payload: ["value": value])
    }

    private func reject(requestId: String, message: String) {
        evaluate(requestId: requestId, payload: ["error": message])
    }

    private func evaluate(requestId: String, payload: [String: Any]) {
        // Both the requestId and the JSON payload are serialized through
        // JSONSerialization before being spliced into the JS call, so
        // nothing here can break out of the string literals it's placed
        // into (matters because requestId round-trips through JS we don't
        // control the exact bytes of, and payload can carry arbitrary
        // product titles from the App Store).
        guard
            let payloadData = try? JSONSerialization.data(withJSONObject: payload),
            let idData = try? JSONSerialization.data(withJSONObject: [requestId]),
            let payloadJSON = String(data: payloadData, encoding: .utf8),
            var idJSON = String(data: idData, encoding: .utf8)
        else { return }
        idJSON.removeFirst() // strip the wrapping [ ] JSONSerialization
        idJSON.removeLast()  // needed just to safely quote a bare string

        let script = "window.__iosBillingResolve(\(idJSON), \(payloadJSON))"
        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript(script, completionHandler: nil)
        }
    }
}
