using System.Net;
using System.Security.Claims;
using System.Text.Json;
using CrossFit.Core.Enums;
using CrossFit.Core.Interfaces;

namespace CrossFit.API.Middleware;

// ─── Global Exception Middleware ─────────────────────────────────────────────
public class ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        try
        {
            await next(ctx);
        }
        catch (UnauthorizedAccessException ex)
        {
            logger.LogWarning(ex, "Unauthorized");
            await WriteError(ctx, HttpStatusCode.Unauthorized, ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            await WriteError(ctx, HttpStatusCode.NotFound, ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            await WriteError(ctx, HttpStatusCode.BadRequest, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception");
            await WriteError(ctx, HttpStatusCode.InternalServerError, "An unexpected error occurred");
        }
    }

    private static Task WriteError(HttpContext ctx, HttpStatusCode code, string message)
    {
        ctx.Response.ContentType = "application/json";
        ctx.Response.StatusCode = (int)code;
        var body = JsonSerializer.Serialize(new { error = message, statusCode = (int)code });
        return ctx.Response.WriteAsync(body);
    }
}

// ─── Tenant Middleware (injects org slug from header / subdomain) ─────────────
public class TenantMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        // Accept org slug from header X-Organization or from subdomain
        if (!ctx.Request.Headers.TryGetValue("X-Organization", out var slug))
        {
            var host = ctx.Request.Host.Host;
            var parts = host.Split('.');
            if (parts.Length > 2) slug = parts[0];
        }
        if (!string.IsNullOrEmpty(slug))
            ctx.Items["OrgSlug"] = slug.ToString();

        await next(ctx);
    }
}

// ─── CurrentUserService ───────────────────────────────────────────────────────
public class CurrentUserService(IHttpContextAccessor accessor) : ICurrentUserService
{
    private ClaimsPrincipal? User => accessor.HttpContext?.User;

    public Guid UserId =>
        Guid.Parse(User?.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException("Not authenticated"));

    public Guid OrganizationId =>
        Guid.Parse(User?.FindFirstValue("org")
            ?? throw new UnauthorizedAccessException("Organization claim missing"));

    public UserRole Role =>
        Enum.TryParse<UserRole>(User?.FindFirstValue(ClaimTypes.Role), out var role)
            ? role
            : UserRole.Athlete;
}
