using Amazon.S3;
using CrossFit.Core.Interfaces;
using CrossFit.Infrastructure.Data;
using CrossFit.Infrastructure.Repositories;
using CrossFit.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CrossFit.Infrastructure;

public static class InfrastructureRegistration
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services, IConfiguration config)
    {
        // Database
        services.AddDbContext<AppDbContext>(opts =>
            opts.UseNpgsql(
                config.GetConnectionString("DefaultConnection"),
                b => b.MigrationsAssembly("CrossFit.Infrastructure")
                       .EnableRetryOnFailure(3)
            )
        );

        // S3 / Cloudflare R2
        services.AddSingleton<IAmazonS3>(_ =>
        {
            var cfg = new AmazonS3Config
            {
                ServiceURL = config["Storage:ServiceUrl"] ?? "https://s3.amazonaws.com",
                ForcePathStyle = true
            };
            return new AmazonS3Client(
                config["Storage:AccessKey"],
                config["Storage:SecretKey"],
                cfg
            );
        });

        // Repositories
        services.AddScoped<IOrganizationRepository, OrganizationRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IProgramRepository, ProgramRepository>();
        services.AddScoped<ISessionRepository, SessionRepository>();
        services.AddScoped<IFeedbackRepository, FeedbackRepository>();

        // Services
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IMediaService, MediaService>();

        return services;
    }
}
