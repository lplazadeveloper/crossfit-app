using Amazon.S3;
using Amazon.S3.Model;
using CrossFit.Core.DTOs;
using CrossFit.Core.Enums;
using CrossFit.Core.Interfaces;
using Microsoft.Extensions.Configuration;

namespace CrossFit.Infrastructure.Services;

public class MediaService(IConfiguration config, IAmazonS3 s3) : IMediaService
{
    private readonly string _bucket = config["Storage:Bucket"] ?? "crossfit-media";
    private readonly string _publicBase = config["Storage:PublicBaseUrl"] ?? "https://media.example.com";
    private readonly long _maxVideoBytes = 500 * 1024 * 1024;    // 500 MB
    private readonly long _maxImageBytes = 20 * 1024 * 1024;     // 20 MB
    private readonly long _maxFileBytes = 50 * 1024 * 1024;      // 50 MB

    private static readonly HashSet<string> AllowedMimes = new(StringComparer.OrdinalIgnoreCase)
    {
        // Video
        "video/mp4", "video/quicktime", "video/webm", "video/x-msvideo",
        // Image
        "image/jpeg", "image/png", "image/gif", "image/webp", "image/heic",
        // Document
        "application/pdf",
    };

    public bool IsAllowedMimeType(string mimeType) => AllowedMimes.Contains(mimeType);

    public bool IsWithinSizeLimit(long bytes, string mimeType)
    {
        if (mimeType.StartsWith("video/")) return bytes <= _maxVideoBytes;
        if (mimeType.StartsWith("image/")) return bytes <= _maxImageBytes;
        return bytes <= _maxFileBytes;
    }

    public async Task<MediaUploadResponse> GenerateUploadUrlAsync(
        Guid sessionId, Guid userId, string fileName, string mimeType, long fileSize)
    {
        if (!IsAllowedMimeType(mimeType))
            throw new InvalidOperationException($"Mime type not allowed: {mimeType}");
        if (!IsWithinSizeLimit(fileSize, mimeType))
            throw new InvalidOperationException($"File too large: {fileSize} bytes");

        var ext = Path.GetExtension(fileName);
        var key = $"feedback/{sessionId}/{userId}/{Guid.NewGuid()}{ext}";

        var request = new GetPreSignedUrlRequest
        {
            BucketName = _bucket,
            Key = key,
            Verb = HttpVerb.PUT,
            ContentType = mimeType,
            Expires = DateTime.UtcNow.AddMinutes(15)
        };

        var uploadUrl = await s3.GetPreSignedURLAsync(request);
        var mediaUrl = $"{_publicBase}/{key}";

        return new MediaUploadResponse(uploadUrl, mediaUrl, string.Empty);
    }

    public async Task DeleteMediaAsync(string mediaUrl)
    {
        var key = mediaUrl.Replace($"{_publicBase}/", "");
        await s3.DeleteObjectAsync(_bucket, key);
    }
}
