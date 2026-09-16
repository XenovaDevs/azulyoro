using System.Security.Claims;
using Azulyoro.Api.Configuration;
using Azulyoro.Infrastructure.Email;
using Azulyoro.Infrastructure.Identity;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Identity;

namespace Azulyoro.Api.Features.Auth;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapPost("/register", Register)
            .AddEndpointFilter<AntiforgeryEndpointFilter>()
            .RequireRateLimiting(ApiHardening.SensitivePolicy);

        group.MapGet("/verify-email", VerifyEmail);

        group.MapPost("/login", Login)
            .AddEndpointFilter<AntiforgeryEndpointFilter>()
            .RequireRateLimiting(ApiHardening.SensitivePolicy);

        group.MapPost("/logout", Logout);

        group.MapGet("/me", Me);

        group.MapPost("/forgot-password", ForgotPassword)
            .AddEndpointFilter<AntiforgeryEndpointFilter>()
            .RequireRateLimiting(ApiHardening.SensitivePolicy);

        group.MapPost("/reset-password", ResetPassword)
            .AddEndpointFilter<AntiforgeryEndpointFilter>()
            .RequireRateLimiting(ApiHardening.SensitivePolicy);

        group.MapGet("/csrf", Csrf);

        return app;
    }

    private static string FrontendBase(IConfiguration config) =>
        (config["Frontend:BaseUrl"] ?? "http://localhost:3000").TrimEnd('/');

    private static string NormalizeLocale(string? locale) =>
        locale?.Trim().ToLowerInvariant() is "en" ? "en" : "es";

    // --- Register ---------------------------------------------------------

    public record RegisterRequest(string Email, string Password, string? DisplayName, string? Locale);

    private static async Task<IResult> Register(
        RegisterRequest req,
        UserManager<AppUser> users,
        IEmailSender email,
        IConfiguration config,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
        {
            return Results.Problem(
                detail: "Email and password are required.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        var locale = NormalizeLocale(req.Locale);
        var existing = await users.FindByEmailAsync(req.Email);
        if (existing is not null)
        {
            // Do not reveal whether the email already exists.
            return Results.Ok(new { message = "registration_received" });
        }

        var user = new AppUser
        {
            UserName = req.Email,
            Email = req.Email,
            DisplayName = req.DisplayName,
            LocalePref = locale,
            CreatedAt = DateTime.UtcNow,
            IsActive = true,
        };

        var result = await users.CreateAsync(user, req.Password);
        if (!result.Succeeded)
        {
            return Results.ValidationProblem(
                result.Errors.GroupBy(e => e.Code)
                    .ToDictionary(g => g.Key, g => g.Select(e => e.Description).ToArray()));
        }

        await users.AddToRoleAsync(user, AppRoles.Member);

        var token = await users.GenerateEmailConfirmationTokenAsync(user);
        var link = $"{FrontendBase(config)}/{locale}/verificar-email" +
            $"?token={Uri.EscapeDataString(token)}&email={Uri.EscapeDataString(user.Email!)}";

        await email.SendAsync(
            user.Email!,
            "Confirma tu correo - Azul y Oro",
            $"<p>Confirma tu correo para activar tu cuenta:</p><p><a href=\"{link}\">Confirmar correo</a></p>",
            ct);

        return Results.Ok(new { message = "registration_received" });
    }

    // --- Verify email -----------------------------------------------------

    private static async Task<IResult> VerifyEmail(
        string token,
        string email,
        UserManager<AppUser> users)
    {
        if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(email))
        {
            return Results.BadRequest();
        }

        var user = await users.FindByEmailAsync(email);
        if (user is null)
        {
            return Results.BadRequest(new { message = "invalid_token" });
        }

        var result = await users.ConfirmEmailAsync(user, token);
        return result.Succeeded
            ? Results.Ok(new { message = "email_confirmed" })
            : Results.BadRequest(new { message = "invalid_token" });
    }

    // --- Login ------------------------------------------------------------

    public record LoginRequest(string Email, string Password);

    private static async Task<IResult> Login(
        LoginRequest req,
        SignInManager<AppUser> signIn,
        UserManager<AppUser> users)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
        {
            return Results.Unauthorized();
        }

        var user = await users.FindByEmailAsync(req.Email);
        if (user is null || !user.IsActive)
        {
            return Results.Unauthorized();
        }

        if (user.IsBanned)
        {
            return Results.Problem(
                detail: "Tu cuenta ha sido suspendida permanentemente por incumplir las normas comunitarias.",
                statusCode: StatusCodes.Status403Forbidden);
        }

        if (user.IsSuspended)
        {
            return Results.Problem(
                detail: $"Tu cuenta está temporalmente suspendida hasta el {user.SuspendedUntil:dd/MM/yyyy HH:mm} UTC. Motivo: {user.BanReason ?? "Incumplimiento de normas"}",
                statusCode: StatusCodes.Status403Forbidden);
        }

        var result = await signIn.PasswordSignInAsync(
            user, req.Password, isPersistent: true, lockoutOnFailure: true);

        if (!result.Succeeded)
        {
            return Results.Unauthorized();
        }

        user.LastLoginAt = DateTime.UtcNow;
        await users.UpdateAsync(user);

        var roles = await users.GetRolesAsync(user);
        return Results.Ok(new
        {
            user = new
            {
                email = user.Email,
                displayName = user.DisplayName,
                locale = user.LocalePref,
                roles,
            },
        });
    }

    // --- Logout -----------------------------------------------------------

    private static async Task<IResult> Logout(SignInManager<AppUser> signIn)
    {
        await signIn.SignOutAsync();
        return Results.Ok(new { message = "signed_out" });
    }

    // --- Me ---------------------------------------------------------------

    private static async Task<IResult> Me(
        ClaimsPrincipal principal,
        UserManager<AppUser> users)
    {
        if (principal.Identity?.IsAuthenticated != true)
        {
            return Results.Unauthorized();
        }

        var user = await users.GetUserAsync(principal);
        if (user is null)
        {
            return Results.Unauthorized();
        }

        var roles = await users.GetRolesAsync(user);
        return Results.Ok(new
        {
            id = user.Id,
            email = user.Email,
            displayName = user.DisplayName,
            locale = user.LocalePref,
            roles,
            isBanned = user.IsBanned,
            isSuspended = user.IsSuspended,
            suspendedUntil = user.SuspendedUntil,
            banReason = user.BanReason,
        });
    }

    // --- Forgot password --------------------------------------------------

    public record ForgotPasswordRequest(string Email, string? Locale);

    private static async Task<IResult> ForgotPassword(
        ForgotPasswordRequest req,
        UserManager<AppUser> users,
        IEmailSender email,
        IConfiguration config,
        CancellationToken ct)
    {
        var user = string.IsNullOrWhiteSpace(req.Email)
            ? null
            : await users.FindByEmailAsync(req.Email);

        if (user is not null)
        {
            var locale = NormalizeLocale(req.Locale ?? user.LocalePref);
            var token = await users.GeneratePasswordResetTokenAsync(user);
            var link = $"{FrontendBase(config)}/{locale}/restablecer-password" +
                $"?token={Uri.EscapeDataString(token)}&email={Uri.EscapeDataString(user.Email!)}";

            await email.SendAsync(
                user.Email!,
                "Restablece tu contrasena - Azul y Oro",
                $"<p>Solicitaste restablecer tu contrasena:</p><p><a href=\"{link}\">Restablecer</a></p>" +
                "<p>Si no fuiste vos, ignora este correo.</p>",
                ct);
        }

        // Always 200: never reveal whether the email exists.
        return Results.Ok(new { message = "if_exists_email_sent" });
    }

    // --- Reset password ---------------------------------------------------

    public record ResetPasswordRequest(string Email, string Token, string NewPassword);

    private static async Task<IResult> ResetPassword(
        ResetPasswordRequest req,
        UserManager<AppUser> users)
    {
        if (string.IsNullOrWhiteSpace(req.Email) ||
            string.IsNullOrWhiteSpace(req.Token) ||
            string.IsNullOrWhiteSpace(req.NewPassword))
        {
            return Results.BadRequest(new { message = "invalid_request" });
        }

        var user = await users.FindByEmailAsync(req.Email);
        if (user is null)
        {
            return Results.BadRequest(new { message = "invalid_token" });
        }

        var result = await users.ResetPasswordAsync(user, req.Token, req.NewPassword);
        return result.Succeeded
            ? Results.Ok(new { message = "password_reset" })
            : Results.ValidationProblem(
                result.Errors.GroupBy(e => e.Code)
                    .ToDictionary(g => g.Key, g => g.Select(e => e.Description).ToArray()));
    }

    // --- CSRF -------------------------------------------------------------

    private static IResult Csrf(HttpContext http, IAntiforgery antiforgery)
    {
        var tokens = antiforgery.GetAndStoreTokens(http);
        return Results.Ok(new { token = tokens.RequestToken });
    }
}
