using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using CrossFit.Core.DTOs;
using CrossFit.Core.Entities;
using CrossFit.Core.Enums;
using CrossFit.Core.Interfaces;
using Google.Apis.Auth;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace CrossFit.Infrastructure.Services;

public class AuthService(
    IUserRepository users,
    IOrganizationRepository orgs,
    IConfiguration config) : IAuthService
{
    private readonly string _jwtKey = config["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key missing");
    private readonly string _jwtIssuer = config["Jwt:Issuer"] ?? "crossfit-app";
    private readonly string _jwtAudience = config["Jwt:Audience"] ?? "crossfit-app";
    private readonly int _accessTokenMinutes = int.Parse(config["Jwt:AccessTokenMinutes"] ?? "15");
    private readonly int _refreshTokenDays = int.Parse(config["Jwt:RefreshTokenDays"] ?? "30");
    private readonly string _googleClientId = config["Google:ClientId"] ?? throw new InvalidOperationException("Google:ClientId missing");

    public async Task<AuthResponse> AuthenticateWithGoogleAsync(string idToken, string organizationSlug)
    {
        // 1. Verify Google token
        var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, new GoogleJsonWebSignature.ValidationSettings
        {
            Audience = [_googleClientId]
        });

        // 2. Get organization
        var org = await orgs.GetBySlugAsync(organizationSlug)
            ?? throw new UnauthorizedAccessException("Organization not found");

        // 3. Find or create user
        var user = await users.GetByGoogleIdAsync(payload.Subject);

        if (user == null)
        {
            // First login: create athlete by default
            user = new User
            {
                GoogleId = payload.Subject,
                Email = payload.Email,
                Name = payload.Name,
                AvatarUrl = payload.Picture,
                OrganizationId = org.Id,
                Role = UserRole.Athlete
            };
            user = await users.CreateAsync(user);
        }
        else
        {
            // Update profile info
            user.Name = payload.Name;
            user.AvatarUrl = payload.Picture;
        }

        // 4. Generate tokens
        var refreshToken = GenerateRefreshToken();
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(_refreshTokenDays);
        await users.UpdateAsync(user);

        var accessToken = GenerateJwt(user);

        return new AuthResponse(accessToken, refreshToken, MapToDto(user));
    }

    public async Task<AuthResponse> RefreshTokenAsync(string refreshToken)
    {
        // Find user by refresh token (in production, use a separate table)
        // For simplicity we search by token — in prod index this
        throw new NotImplementedException("Search by refresh token in users table");
    }

    public async Task RevokeTokenAsync(Guid userId)
    {
        var user = await users.GetByIdAsync(userId)
            ?? throw new KeyNotFoundException("User not found");
        user.RefreshToken = null;
        user.RefreshTokenExpiry = null;
        await users.UpdateAsync(user);
    }

    private string GenerateJwt(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim("org", user.OrganizationId.ToString()),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.Name),
        };
        var token = new JwtSecurityToken(
            issuer: _jwtIssuer,
            audience: _jwtAudience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_accessTokenMinutes),
            signingCredentials: creds
        );
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string GenerateRefreshToken()
    {
        var bytes = new byte[64];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes);
    }

    private static UserDto MapToDto(User u) => new(
        u.Id, u.Name, u.Email, u.AvatarUrl, u.Role,
        u.OrganizationId, u.Organization?.Name ?? string.Empty
    );
}
