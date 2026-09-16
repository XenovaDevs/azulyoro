using Azulyoro.Domain.Entities;
using Azulyoro.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Azulyoro.Infrastructure.Content;

public static class ForumSeeder
{
    public static async Task SeedForumCategoriesAsync(AppDbContext db, CancellationToken ct)
    {
        var existingSlugs = await db.ForumCategories
            .Select(c => c.Slug)
            .ToListAsync(ct);

        var categories = new List<ForumCategory>
        {
            new()
            {
                Name = "Partidos y Plantel",
                Slug = "partidos",
                Description = "Discusión de cada partido, alineaciones, rendimiento y análisis táctico.",
                Icon = "shield",
                DisplayOrder = 1,
                IsActive = true,
            },
            new()
            {
                Name = "Debate General",
                Slug = "general",
                Description = "Charlas sobre el mundo Boca, historia, mística y actualidad xeneize.",
                Icon = "message-circle",
                DisplayOrder = 2,
                IsActive = true,
            },
            new()
            {
                Name = "Mercado de Pases",
                Slug = "mercado",
                Description = "Rumores, posibles refuerzos, altas, bajas y renovaciones del plantel.",
                Icon = "repeat",
                DisplayOrder = 3,
                IsActive = true,
            },
            new()
            {
                Name = "La Bombonera y Socios",
                Slug = "bombonera",
                Description = "Entradas, viajes, experiencias en el Templo y vida societaria.",
                Icon = "map-pin",
                DisplayOrder = 4,
                IsActive = true,
            },
        };

        var toAdd = categories.Where(c => !existingSlugs.Contains(c.Slug)).ToList();
        if (toAdd.Count > 0)
        {
            db.ForumCategories.AddRange(toAdd);
            await db.SaveChangesAsync(ct);
        }
    }
}
