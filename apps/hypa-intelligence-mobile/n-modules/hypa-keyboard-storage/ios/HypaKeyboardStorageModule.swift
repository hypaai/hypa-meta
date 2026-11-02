import AVFoundation
import ExpoModulesCore

private let appGroupId = "group.com.hypaintelligence.hypaintelligence"
private let legacyAppGroupId = "group.com.hypaintelligence.keyboard"
private let prefsKey = "settings_json"
private let debugEventsKey = "keyboard_storage_debug_events"
private let sharedStoreFileName = "hypa_shared_store.json"

private func sharedContainerURL() -> URL? {
  let manager = FileManager.default
  return manager.containerURL(forSecurityApplicationGroupIdentifier: appGroupId)
    ?? manager.containerURL(forSecurityApplicationGroupIdentifier: legacyAppGroupId)
}

private func sharedStoreURL() -> URL? {
  sharedContainerURL()?.appendingPathComponent(sharedStoreFileName)
}

private func emptySharedStoreJson() -> String {
  "{\"version\":1,\"updatedAt\":0,\"entries\":{},\"lexicon\":[]}"
}

private func debugPayload(_ message: String, groupId: String, source: String) -> [String: Any] {
  [
    "message": message,
    "groupId": groupId,
    "source": source,
    "timestamp": Date().timeIntervalSince1970
  ]
}

private func appendKeyboardStorageDebug(_ payload: [String: Any]) {
  guard let defaults = UserDefaults(suiteName: appGroupId) ?? UserDefaults(suiteName: legacyAppGroupId) else {
    return
  }

  var events = defaults.array(forKey: debugEventsKey) as? [[String: Any]] ?? []
  events.append(payload)
  if events.count > 50 {
    events = Array(events.suffix(50))
  }
  defaults.set(events, forKey: debugEventsKey)
  defaults.synchronize()
}

private func defaultSettingsJson() -> String {
  """
  {"languageId":"en","name":"","token":"","translationProvider":"\(HypaKeyboardGeneratedDefaults.provider)","translationModel":"\(HypaKeyboardGeneratedDefaults.translationModel)","dictionaryProvider":"\(HypaKeyboardGeneratedDefaults.provider)","dictionaryModel":"\(HypaKeyboardGeneratedDefaults.dictionaryModel)","ttsProvider":"\(HypaKeyboardGeneratedDefaults.provider)","ttsModel":"\(HypaKeyboardGeneratedDefaults.ttsModel)","sttProvider":"\(HypaKeyboardGeneratedDefaults.provider)","sttModel":"\(HypaKeyboardGeneratedDefaults.sttModel)","voice":"\(HypaKeyboardGeneratedDefaults.voice)","ttsLanguage":"en","dictionaryLanguage":"English","translateSourceLanguage":"\(HypaKeyboardGeneratedDefaults.translateSourceLanguage)","translateTargetLanguage":"Yoruba","longPressDurationMs":500,"usageStats":{"wordsSaved":0,"wordsTyped":0,"streakDays":0,"lastActiveDate":""},"appearance":"system","themeDark":{"surface":"#1A1A1A","toolbar":"#515151","key":"#515151","keyPressed":"#444444","label":"#FFFFFF","accent":"#515151","pill":"#FFFFFF","pillLabel":"#111111"},"themeLight":{"surface":"#D1D5DB","toolbar":"#FFFFFF","key":"#FFFFFF","keyPressed":"#E5E7EB","label":"#111111","accent":"#6B7280","pill":"#111111","pillLabel":"#FFFFFF"},"predictiveBarEnabled":true,"autocorrectEnabled":true,"hapticsEnabled":true,"vibrationStrength":255,"fontSize":24,"keyboardHeight":260}
  """
}

private func keyboardDefaults() -> UserDefaults {
  guard let sharedDefaults = UserDefaults(suiteName: appGroupId) else {
    NSLog("[HypaKeyboardStorage] App Group unavailable, falling back to standard UserDefaults")
    appendKeyboardStorageDebug(debugPayload(
      "App Group unavailable, falling back to standard UserDefaults",
      groupId: appGroupId,
      source: "main-app"
    ))
    return UserDefaults.standard
  }

  if sharedDefaults.string(forKey: prefsKey) == nil,
     let legacyJson = legacySettingsJson(),
     !legacyJson.isEmpty {
    sharedDefaults.set(legacyJson, forKey: prefsKey)
    sharedDefaults.synchronize()
    NSLog("[HypaKeyboardStorage] Migrated legacy settings_json=%@", legacyJson)
    appendKeyboardStorageDebug(debugPayload(
      "Migrated legacy settings_json=\(legacyJson)",
      groupId: appGroupId,
      source: "main-app"
    ))
  }

  return sharedDefaults
}

private func legacySettingsJson() -> String? {
  if let appGroupDefaults = UserDefaults(suiteName: legacyAppGroupId),
     let json = appGroupDefaults.string(forKey: prefsKey),
     !json.isEmpty {
    return json
  }

  if let json = UserDefaults.standard.string(forKey: prefsKey), !json.isEmpty {
    return json
  }

  return nil
}

public class HypaKeyboardStorageModule: Module {
  public func definition() -> ModuleDefinition {
    Name("HypaKeyboardStorage")

    Events("settingsChanged", "debugLog", "sharedStoreChanged")

    Function("getSharedStoreJson") { () -> String in
      guard
        let url = sharedStoreURL(),
        let data = try? Data(contentsOf: url),
        let json = String(data: data, encoding: .utf8),
        !json.isEmpty
      else {
        return emptySharedStoreJson()
      }
      return json
    }

    AsyncFunction("setSharedStoreJson") { (json: String) in
      guard let url = sharedStoreURL() else {
        throw Exception(
          name: "SharedStoreUnavailable",
          description: "App Group container \(appGroupId) is unavailable"
        )
      }
      guard let data = json.data(using: .utf8) else {
        throw Exception(name: "SharedStoreEncoding", description: "Shared store JSON is not UTF-8")
      }
      try data.write(to: url, options: .atomic)
      self.sendEvent("sharedStoreChanged", ["source": "js"])
    }

    Function("getSettingsJson") { () -> String in
      let defaults = keyboardDefaults()
      if let existing = defaults.string(forKey: prefsKey), !existing.isEmpty {
        NSLog("[HypaKeyboardStorage] getSettingsJson=%@", existing)
        self.sendEvent("debugLog", debugPayload(
          "getSettingsJson from \(appGroupId)",
          groupId: appGroupId,
          source: "main-app"
        ))
        return existing
      }
      let fallback = defaultSettingsJson()
      NSLog("[HypaKeyboardStorage] getSettingsJson fallback=%@", fallback)
      self.sendEvent("debugLog", debugPayload(
        "getSettingsJson fallback from \(appGroupId)",
        groupId: appGroupId,
        source: "main-app"
      ))
      return fallback
    }

    AsyncFunction("setSettingsJson") { (json: String) in
      let defaults = keyboardDefaults()
      defaults.set(json, forKey: prefsKey)
      defaults.synchronize()
      NSLog("[HypaKeyboardStorage] setSettingsJson=%@", json)
      self.sendEvent("settingsChanged", ["source": "js"])
      self.sendEvent("debugLog", debugPayload(
        "setSettingsJson to \(appGroupId)",
        groupId: appGroupId,
        source: "main-app"
      ))
    }

    Function("drainDebugEvents") { () -> [[String: Any]] in
      let defaults = UserDefaults(suiteName: appGroupId)
        ?? UserDefaults(suiteName: legacyAppGroupId)
        ?? UserDefaults.standard
      let events = defaults.array(forKey: debugEventsKey) as? [[String: Any]] ?? []
      defaults.removeObject(forKey: debugEventsKey)
      defaults.synchronize()
      for event in events {
        self.sendEvent("debugLog", event)
      }
      return events
    }

    AsyncFunction("startKeyboardMic") { (promise: Promise) in
      AVAudioSession.sharedInstance().requestRecordPermission { allowed in
        DispatchQueue.main.async {
          guard allowed else {
            return promise.reject("MicDenied", "Allow microphone access for Hypa Intelligence in Settings.")
          }
          do {
            try KeyboardMic.shared.start()
            promise.resolve(nil)
          } catch {
            promise.reject("MicFailed", error.localizedDescription)
          }
        }
      }
    }

    Function("stopKeyboardMic") {
      KeyboardMic.shared.shutdown()
    }
  }
}

// Must match KeyboardViewController's copies.
private let keyboardMicStart = "com.hypaintelligence.keyboard-mic.start"
private let keyboardMicStop = "com.hypaintelligence.keyboard-mic.stop"
private let keyboardMicHeartbeatKey = "keyboard_mic_heartbeat"
private let keyboardMicFileName = "keyboard-mic.pcm"
private let keyboardMicOwnerKey = "keyboard_mic_owner"

/// iOS keyboards can't use the microphone, so the app records for them. Opened once
/// from the keyboard, the app keeps the mic running in the background (audio
/// background mode), so later taps start without leaving the keyboard. The keyboard
/// sends start/stop as Darwin notifications and gets 16 kHz mono PCM back as a file
/// in the App Group container. A heartbeat in shared defaults tells it the mic is live.
private final class KeyboardMic {
  static let shared = KeyboardMic()
  // ponytail: one idle window for both warm mic and abandoned captures.
  private static let idleTimeout: TimeInterval = 5 * 60

  private let engine = AVAudioEngine()
  private let queue = DispatchQueue(label: "hypa.keyboard-mic")
  private var pcm = Data()
  private var capturing = false
  private var lastActivity = Date()
  private var heartbeat: Timer?

  private init() {
    let center = CFNotificationCenterGetDarwinNotifyCenter()
    for name in [keyboardMicStart, keyboardMicStop] {
      CFNotificationCenterAddObserver(
        center, Unmanaged.passUnretained(self).toOpaque(),
        { _, _, name, _, _ in
          let isStart = name?.rawValue as String? == keyboardMicStart
          DispatchQueue.main.async {
            isStart ? KeyboardMic.shared.beginCapture() : KeyboardMic.shared.endCapture()
          }
        }, name as CFString, nil, .deliverImmediately)
    }
  }

  func start() throws {
    if !engine.isRunning {
      let session = AVAudioSession.sharedInstance()
      try session.setCategory(.playAndRecord, mode: .default, options: [.mixWithOthers])
      try session.setActive(true)
      let input = engine.inputNode
      let inFmt = input.outputFormat(forBus: 0)
      guard inFmt.channelCount > 0,
        let outFmt = AVAudioFormat(
          commonFormat: .pcmFormatInt16, sampleRate: 16000, channels: 1, interleaved: true),
        let converter = AVAudioConverter(from: inFmt, to: outFmt)
      else {
        throw NSError(
          domain: "HypaKeyboardMic", code: 1,
          userInfo: [NSLocalizedDescriptionKey: "No microphone input"])
      }
      input.removeTap(onBus: 0)
      input.installTap(onBus: 0, bufferSize: 2048, format: inFmt) { [weak self] buf, _ in
        self?.append(buf, converter: converter, format: outFmt)
      }
      engine.prepare()
      try engine.start()
      heartbeat?.invalidate()
      heartbeat = Timer.scheduledTimer(withTimeInterval: 2, repeats: true) { [weak self] _ in
        self?.tick()
      }
    }
    beginCapture()
    tick()
  }

  private func beginCapture() {
    guard engine.isRunning else { return }
    lastActivity = Date()
    queue.sync {
      pcm = Data()
      capturing = true
    }
  }

  private func endCapture() {
    lastActivity = Date()
    let data: Data? = queue.sync {
      guard capturing else { return nil }
      capturing = false
      defer { pcm = Data() }
      return pcm
    }
    guard let data,
      let url = FileManager.default
        .containerURL(forSecurityApplicationGroupIdentifier: appGroupId)?
        .appendingPathComponent(keyboardMicFileName)
    else { return }
    try? data.write(to: url, options: .atomic)
  }

  private func tick() {
    guard Date().timeIntervalSince(lastActivity) < Self.idleTimeout else { return shutdown() }
    UserDefaults(suiteName: appGroupId)?
      .set(Date().timeIntervalSince1970, forKey: keyboardMicHeartbeatKey)
  }

  func shutdown() {
    heartbeat?.invalidate()
    heartbeat = nil
    engine.inputNode.removeTap(onBus: 0)
    engine.stop()
    queue.sync {
      capturing = false
      pcm = Data()
    }
    let defaults = UserDefaults(suiteName: appGroupId)
    defaults?.removeObject(forKey: keyboardMicHeartbeatKey)
    // So the keyboard doesn't come back showing "Listening…".
    defaults?.removeObject(forKey: keyboardMicOwnerKey)
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
  }

  private func append(_ buf: AVAudioPCMBuffer, converter: AVAudioConverter, format: AVAudioFormat) {
    let capacity = AVAudioFrameCount(Double(buf.frameLength) * format.sampleRate / buf.format.sampleRate) + 1
    guard let out = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: capacity) else { return }
    var fed = false
    var error: NSError?
    let status = converter.convert(to: out, error: &error) { _, outStatus in
      if fed {
        outStatus.pointee = .noDataNow
        return nil
      }
      fed = true
      outStatus.pointee = .haveData
      return buf
    }
    guard status != .error, error == nil, out.frameLength > 0, let channel = out.int16ChannelData
    else { return }
    let data = Data(bytes: channel[0], count: Int(out.frameLength) * MemoryLayout<Int16>.size)
    queue.async { [weak self] in
      guard let self, self.capturing else { return }
      self.pcm.append(data)
    }
  }
}
