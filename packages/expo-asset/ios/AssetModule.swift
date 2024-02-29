import ExpoModulesCore
import CryptoKit

internal class UnableToDownloadAssetException: GenericException<URL> {
  override var reason: String {
    "Unable to download asset from url: \(param)"
  }
}

public class AssetModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AssetModule")

    AsyncFunction("downloadAsync") { (url: URL, md5Hash: String?, type: String, promise: Promise) in
      if url.isFileURL {
        promise.resolve(url.standardizedFileURL.absoluteString)
      }
      guard let cacheFileId = md5Hash ?? getMD5Hash(fromURL: url),
      let cachesDirectory = appContext?.fileSystem?.cachesDirectory,
      let appContext = appContext else {
        promise.reject(UnableToDownloadAssetException(url))
        return
      }

      let localUrl = URL(fileURLWithPath: "\(cachesDirectory)/ExponentAsset-\(cacheFileId).\(type)")

      guard let fileData = FileManager.default.contents(atPath: localUrl.path) else {
        downloadAsset(appContext: appContext, url: url, localUrl: localUrl, promise: promise)
        return
      }
      if md5Hash == nil {
        promise.resolve(localUrl.standardizedFileURL.absoluteString)
        return
      }
      if md5Hash == getMD5Hash(fromData: fileData) {
        promise.resolve(localUrl.standardizedFileURL.absoluteString)
        return
      }
      downloadAsset(appContext: appContext, url: url, localUrl: localUrl, promise: promise)
    }
  }

  private func getMD5Hash(fromURL url: URL) -> String? {
    guard let urlData = url.absoluteString.data(using: .utf8) else {
      return nil
    }
    return getMD5Hash(fromData: urlData)
  }

  private func getMD5Hash(fromData data: Data?) -> String? {
    guard let data = data else {
      return nil
    }
    return Data(Insecure.MD5.hash(data: data)).base64EncodedString()
  }

  func downloadAsset(appContext: AppContext, url: URL, localUrl: URL, promise: Promise) {
    do {
      try appContext.fileSystem?.ensureDirExists(withPath: localUrl.path)
    } catch {
      promise.reject(UnableToDownloadAssetException(url))
      return
    }
    guard let fileSystem = appContext.fileSystem else {
      promise.reject(UnableToDownloadAssetException(url))
      return
    }
    guard fileSystem.permissions(forURI: localUrl).contains(EXFileSystemPermissionFlags.write) else {
      promise.reject(UnableToDownloadAssetException(url))
      return
    }

    let downloadTask = URLSession.shared.downloadTask(with: url) { urlOrNil, _, _ in
      guard let fileURL = urlOrNil else {
        promise.reject(UnableToDownloadAssetException(url))
        return
      }
      do {
        try? FileManager.default.removeItem(at: localUrl)
        try FileManager.default.moveItem(at: fileURL, to: localUrl)
        promise.resolve(localUrl.standardizedFileURL.absoluteString)
      } catch {
        promise.reject(UnableToDownloadAssetException(url))
      }
    }
    downloadTask.resume()
  }
}
