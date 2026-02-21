import Foundation
import Capacitor
import StoreKit

@objc(AppStoreIAPPlugin)
public class AppStoreIAPPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppStoreIAPPlugin"
    public let jsName = "AppStoreIAP"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "queryProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "queryPurchases", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finishTransaction", returnType: CAPPluginReturnPromise),
    ]

    /// Reads the app receipt from Bundle (legacy format) and returns base64 for backend verifyReceipt API.
    private func appReceiptBase64() -> String {
        guard let receiptURL = Bundle.main.appStoreReceiptURL,
              FileManager.default.fileExists(atPath: receiptURL.path),
              let receiptData = try? Data(contentsOf: receiptURL) else {
            return ""
        }
        return receiptData.base64EncodedString()
    }

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": SKPaymentQueue.canMakePayments()])
    }

    @objc func queryProducts(_ call: CAPPluginCall) {
        guard let productIds = call.getArray("productIds", String.self) else {
            call.reject("productIds is required")
            return
        }

        if #available(iOS 15.0, *) {
            Task {
                do {
                    let products = try await Product.products(for: Set(productIds))
                    let mapped = products.map { product -> [String: Any] in
                        var item: [String: Any] = [
                            "id": product.id,
                            "displayName": product.displayName,
                            "description": product.description,
                            "price": "\(product.price)",
                            "displayPrice": product.displayPrice,
                        ]
                        if let subscription = product.subscription {
                            item["subscriptionPeriod"] = "\(subscription.subscriptionPeriod.value) \(subscription.subscriptionPeriod.unit)"
                        }
                        return item
                    }
                    call.resolve(["products": mapped])
                } catch {
                    call.reject("Failed to query products: \(error.localizedDescription)")
                }
            }
        } else {
            call.reject("StoreKit 2 requires iOS 15+")
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("productId is required")
            return
        }

        if #available(iOS 15.0, *) {
            Task {
                do {
                    let products = try await Product.products(for: [productId])
                    guard let product = products.first else {
                        call.reject("Product not found: \(productId)")
                        return
                    }

                    let result = try await product.purchase()

                    switch result {
                    case .success(let verification):
                        switch verification {
                        case .verified(let transaction):
                            call.resolve([
                                "transactionId": "\(transaction.id)",
                                "originalTransactionId": "\(transaction.originalID)",
                                "productId": transaction.productID,
                                "purchaseDate": "\(transaction.purchaseDate.timeIntervalSince1970 * 1000)",
                                "expirationDate": transaction.expirationDate.map { "\($0.timeIntervalSince1970 * 1000)" } ?? "",
                                "receiptData": appReceiptBase64(),
                            ])
                        case .unverified(_, let error):
                            call.reject("Transaction verification failed: \(error.localizedDescription)")
                        }
                    case .userCancelled:
                        call.reject("User cancelled the purchase")
                    case .pending:
                        call.reject("Purchase is pending approval")
                    @unknown default:
                        call.reject("Unknown purchase result")
                    }
                } catch {
                    call.reject("Purchase failed: \(error.localizedDescription)")
                }
            }
        } else {
            call.reject("StoreKit 2 requires iOS 15+")
        }
    }

    @objc func queryPurchases(_ call: CAPPluginCall) {
        if #available(iOS 15.0, *) {
            Task {
                var purchases: [[String: Any]] = []

                let receiptData = appReceiptBase64()
                for await result in Transaction.currentEntitlements {
                    if case .verified(let transaction) = result {
                        purchases.append([
                            "transactionId": "\(transaction.id)",
                            "originalTransactionId": "\(transaction.originalID)",
                            "productId": transaction.productID,
                            "purchaseDate": "\(transaction.purchaseDate.timeIntervalSince1970 * 1000)",
                            "expirationDate": transaction.expirationDate.map { "\($0.timeIntervalSince1970 * 1000)" } ?? "",
                            "receiptData": receiptData,
                        ])
                    }
                }

                call.resolve(["purchases": purchases])
            }
        } else {
            call.reject("StoreKit 2 requires iOS 15+")
        }
    }

    @objc func restorePurchases(_ call: CAPPluginCall) {
        if #available(iOS 15.0, *) {
            Task {
                do {
                    try await AppStore.sync()

                    let receiptData = appReceiptBase64()
                    var purchases: [[String: Any]] = []
                    for await result in Transaction.currentEntitlements {
                        if case .verified(let transaction) = result {
                            purchases.append([
                                "transactionId": "\(transaction.id)",
                                "originalTransactionId": "\(transaction.originalID)",
                                "productId": transaction.productID,
                                "purchaseDate": "\(transaction.purchaseDate.timeIntervalSince1970 * 1000)",
                                "expirationDate": transaction.expirationDate.map { "\($0.timeIntervalSince1970 * 1000)" } ?? "",
                                "receiptData": receiptData,
                            ])
                        }
                    }

                    call.resolve(["purchases": purchases])
                } catch {
                    call.reject("Failed to restore purchases: \(error.localizedDescription)")
                }
            }
        } else {
            call.reject("StoreKit 2 requires iOS 15+")
        }
    }

    @objc func finishTransaction(_ call: CAPPluginCall) {
        guard let transactionIdStr = call.getString("transactionId"),
              let transactionId = UInt64(transactionIdStr) else {
            call.reject("transactionId is required")
            return
        }

        if #available(iOS 15.0, *) {
            Task {
                for await result in Transaction.currentEntitlements {
                    if case .verified(let transaction) = result, transaction.id == transactionId {
                        await transaction.finish()
                        call.resolve(["finished": true])
                        return
                    }
                }
                call.resolve(["finished": false])
            }
        } else {
            call.reject("StoreKit 2 requires iOS 15+")
        }
    }
}
