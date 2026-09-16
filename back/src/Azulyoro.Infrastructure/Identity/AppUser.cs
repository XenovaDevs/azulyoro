using Microsoft.AspNetCore.Identity;

namespace Azulyoro.Infrastructure.Identity;

/// <summary>
/// Application user (ASP.NET Identity, Guid key). Roles (Member/Editor/Admin)
/// are managed via Identity roles.
/// </summary>
public class AppUser : IdentityUser<Guid>
{
    public string? DisplayName { get; set; }
    public string LocalePref { get; set; } = "es";
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsBanned { get; set; }
    public DateTime? SuspendedUntil { get; set; }
    public string? BanReason { get; set; }

    public bool IsSuspended => SuspendedUntil.HasValue && SuspendedUntil.Value > DateTime.UtcNow;
}

public static class AppRoles
{
    public const string Member = "Member";
    public const string Editor = "Editor";
    public const string Admin = "Admin";

    public static readonly string[] All = [Member, Editor, Admin];
}
