import Foundation
import Capacitor
import CoreNFC

/**
 Native iOS NDEF access for the NFC Smart Keychain app, built on Core NFC.

 Operations are honest: a call only resolves when Core NFC reports success.
 Nothing here simulates a tag.

 NOT YET TESTED ON A PHYSICAL DEVICE — open ios/App/App.xcworkspace in Xcode,
 enable the "Near Field Communication Tag Reading" capability and test on a
 real iPhone (iPhone 7 or newer, iOS 13+). The Simulator has no NFC.
 */
@objc(SmartNfcPlugin)
public class SmartNfcPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SmartNfcPlugin"
    public let jsName = "SmartNfc"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "read", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "write", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "erase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel", returnType: CAPPluginReturnPromise)
    ]

    private enum Operation {
        case read
        case write([NFCNDEFPayload])
        case erase
    }

    private var session: NFCNDEFReaderSession?
    private var call: CAPPluginCall?
    private var operation: Operation = .read

    @objc func isAvailable(_ call: CAPPluginCall) {
        if #available(iOS 13.0, *) {
            let available = NFCNDEFReaderSession.readingAvailable
            call.resolve([
                "available": available,
                "reason": available
                    ? "Ready. Hold the top of the iPhone against the tag."
                    : "This iPhone can't use NFC tags. NFC tag reading needs iPhone 7 or newer on iOS 13 or later."
            ])
        } else {
            call.resolve([
                "available": false,
                "reason": "NFC tag reading needs iOS 13 or later."
            ])
        }
    }

    @objc func read(_ call: CAPPluginCall) {
        begin(call, operation: .read, prompt: "Hold your iPhone near the tag to read it.")
    }

    @objc func write(_ call: CAPPluginCall) {
        guard let records = call.getArray("records") as? [[String: Any]] else {
            call.reject("This content can't be turned into NFC data.", "invalid_data")
            return
        }
        var payloads: [NFCNDEFPayload] = []
        for record in records {
            let type = record["recordType"] as? String ?? "text"
            let value = record["value"] as? String ?? ""
            switch type {
            case "url":
                guard let url = URL(string: value),
                      let payload = NFCNDEFPayload.wellKnownTypeURIPayload(url: url) else {
                    call.reject("That link can't be written to a tag.", "invalid_data")
                    return
                }
                payloads.append(payload)
            case "mime":
                let mediaType = record["mediaType"] as? String ?? "text/plain"
                payloads.append(NFCNDEFPayload(
                    format: .media,
                    type: Data(mediaType.utf8),
                    identifier: Data(),
                    payload: Data(value.utf8)
                ))
            case "empty":
                payloads.append(NFCNDEFPayload(format: .empty, type: Data(), identifier: Data(), payload: Data()))
            default:
                guard let payload = NFCNDEFPayload.wellKnownTypeTextPayload(string: value, locale: Locale(identifier: "en")) else {
                    call.reject("That text can't be written to a tag.", "invalid_data")
                    return
                }
                payloads.append(payload)
            }
        }
        begin(call, operation: .write(payloads), prompt: "Hold your iPhone near the tag to write it.")
    }

    @objc func erase(_ call: CAPPluginCall) {
        let empty = NFCNDEFPayload(format: .empty, type: Data(), identifier: Data(), payload: Data())
        begin(call, operation: .erase, prompt: "Hold your iPhone near the tag to erase it.")
        _ = empty
    }

    @objc func cancel(_ call: CAPPluginCall) {
        session?.invalidate()
        session = nil
        finish(error: ("cancelled", "Cancelled."))
        call.resolve()
    }

    private func begin(_ call: CAPPluginCall, operation: Operation, prompt: String) {
        guard #available(iOS 13.0, *), NFCNDEFReaderSession.readingAvailable else {
            call.reject("This iPhone can't use NFC tags.", "unavailable")
            return
        }
        if self.call != nil {
            call.reject("Another NFC action is already running.", "busy")
            return
        }
        self.call = call
        self.operation = operation
        call.keepAlive = true

        DispatchQueue.main.async {
            let session = NFCNDEFReaderSession(delegate: self, queue: nil, invalidateAfterFirstRead: false)
            session.alertMessage = prompt
            self.session = session
            session.begin()
        }
    }

    private func finish(result: [String: Any]? = nil, error: (code: String, message: String)? = nil) {
        guard let call = self.call else { return }
        self.call = nil
        self.session = nil
        if let error = error {
            call.reject(error.message, error.code)
        } else {
            call.resolve(result ?? [:])
        }
    }

    private func decode(_ messages: [NFCNDEFMessage]) -> [[String: Any]] {
        var out: [[String: Any]] = []
        for message in messages {
            for record in message.records {
                switch record.typeNameFormat {
                case .empty:
                    continue
                case .nfcWellKnown:
                    if let url = record.wellKnownTypeURIPayload() {
                        out.append(["recordType": "url", "value": url.absoluteString])
                    } else if let (text, _) = record.wellKnownTypeTextPayload(), let text = text {
                        out.append(["recordType": "text", "value": text])
                    }
                case .media:
                    out.append([
                        "recordType": "mime",
                        "mediaType": String(data: record.type, encoding: .utf8) ?? "",
                        "value": String(data: record.payload, encoding: .utf8) ?? ""
                    ])
                default:
                    out.append([
                        "recordType": "text",
                        "value": String(data: record.payload, encoding: .utf8) ?? ""
                    ])
                }
            }
        }
        return out
    }
}

extension SmartNfcPlugin: NFCNDEFReaderSessionDelegate {
    public func readerSession(_ session: NFCNDEFReaderSession, didDetectNDEFs messages: [NFCNDEFMessage]) {
        // Unused: the tag-based callback below handles every operation.
    }

    public func readerSessionDidBecomeActive(_ session: NFCNDEFReaderSession) {}

    public func readerSession(_ session: NFCNDEFReaderSession, didInvalidateWithError error: Error) {
        guard self.call != nil else { return }
        let nfcError = error as? NFCReaderError
        switch nfcError?.code {
        case .readerSessionInvalidationErrorUserCanceled:
            finish(error: ("cancelled", "Cancelled."))
        case .readerSessionInvalidationErrorSessionTimeout:
            finish(error: ("timeout", "No tag detected. Hold the tag against the top of the iPhone and try again."))
        case .readerSessionInvalidationErrorSystemIsBusy:
            finish(error: ("busy", "NFC is busy right now. Wait a moment and try again."))
        default:
            finish(error: ("failed", error.localizedDescription))
        }
    }

    public func readerSession(_ session: NFCNDEFReaderSession, didDetect tags: [NFCNDEFTag]) {
        guard let tag = tags.first else { return }
        if tags.count > 1 {
            session.alertMessage = "More than one tag found. Show just one tag."
            session.restartPolling()
            return
        }

        session.connect(to: tag) { [weak self] error in
            guard let self = self else { return }
            if let error = error {
                session.invalidate(errorMessage: "Could not connect to the tag.")
                self.finish(error: ("tag_lost", error.localizedDescription))
                return
            }

            tag.queryNDEFStatus { status, capacity, error in
                if let error = error {
                    session.invalidate(errorMessage: "Could not read the tag.")
                    self.finish(error: ("failed", error.localizedDescription))
                    return
                }

                switch status {
                case .notSupported:
                    session.invalidate(errorMessage: "This tag isn't supported.")
                    self.finish(error: ("unsupported_tag", "This tag doesn't hold NDEF data."))
                    return
                case .readOnly:
                    if case .read = self.operation {
                        break
                    }
                    session.invalidate(errorMessage: "This tag is locked.")
                    self.finish(error: ("read_only", "This tag is locked and can't be changed."))
                    return
                default:
                    break
                }

                switch self.operation {
                case .read:
                    tag.readNDEF { message, error in
                        if let error = error, message == nil {
                            session.invalidate(errorMessage: "Could not read the tag.")
                            self.finish(error: ("failed", error.localizedDescription))
                            return
                        }
                        session.alertMessage = "Tag read."
                        session.invalidate()
                        self.finish(result: [
                            "writable": status == .readWrite,
                            "records": self.decode(message.map { [$0] } ?? [])
                        ])
                    }

                case .write(let payloads):
                    let message = NFCNDEFMessage(records: payloads)
                    if message.length > capacity {
                        session.invalidate(errorMessage: "This content is too big for the tag.")
                        self.finish(error: ("too_large",
                            "This content is too big for the tag (\(message.length) of \(capacity) bytes)."))
                        return
                    }
                    tag.writeNDEF(message) { error in
                        if let error = error {
                            session.invalidate(errorMessage: "Write failed.")
                            self.finish(error: ("write_failed", error.localizedDescription))
                            return
                        }
                        // read-after-write verification straight from the chip
                        tag.readNDEF { readBack, _ in
                            session.alertMessage = "Tag written."
                            session.invalidate()
                            self.finish(result: [
                                "success": true,
                                "records": self.decode(readBack.map { [$0] } ?? [])
                            ])
                        }
                    }

                case .erase:
                    let empty = NFCNDEFMessage(records: [
                        NFCNDEFPayload(format: .empty, type: Data(), identifier: Data(), payload: Data())
                    ])
                    tag.writeNDEF(empty) { error in
                        if let error = error {
                            session.invalidate(errorMessage: "Erase failed.")
                            self.finish(error: ("write_failed", error.localizedDescription))
                            return
                        }
                        session.alertMessage = "Tag erased."
                        session.invalidate()
                        self.finish(result: ["success": true])
                    }
                }
            }
        }
    }
}
