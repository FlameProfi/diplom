using System;
using System.Reflection;

namespace Backend.Infrastructure;

public static class EntityDefaults
{
    public static void ApplyCreationDefaults<T>(T entity) where T : class
    {
        var now = DateTime.UtcNow;
        SetIdIfMissing(entity);
        SetDateIfDefault(entity, "CreatedAt", now);
        SetDateIfDefault(entity, "UpdatedAt", now);
        SetDateIfDefault(entity, "Date", now);
        SetDateIfDefault(entity, "IssuedDate", now);
        SetDateIfDefault(entity, "Timestamp", now);
    }

    public static void ApplyUpdateDefaults<T>(T entity) where T : class
    {
        var now = DateTime.UtcNow;
        SetDateIfDefault(entity, "UpdatedAt", now, force: true);
    }

    private static void SetIdIfMissing<T>(T entity) where T : class
    {
        var idProperty = entity.GetType().GetProperty("Id", BindingFlags.Public | BindingFlags.Instance);
        if (idProperty is null || idProperty.PropertyType != typeof(string))
        {
            return;
        }

        var current = idProperty.GetValue(entity) as string;
        if (string.IsNullOrWhiteSpace(current))
        {
            idProperty.SetValue(entity, Guid.NewGuid().ToString());
        }
    }

    private static void SetDateIfDefault<T>(T entity, string propertyName, DateTime value, bool force = false) where T : class
    {
        var prop = entity.GetType().GetProperty(propertyName, BindingFlags.Public | BindingFlags.Instance);
        if (prop is null)
        {
            return;
        }

        if (prop.PropertyType == typeof(DateTime))
        {
            var current = (DateTime)prop.GetValue(entity)!;
            if (force || current == default)
            {
                prop.SetValue(entity, value);
            }

            return;
        }

        if (prop.PropertyType == typeof(DateTime?))
        {
            var current = (DateTime?)prop.GetValue(entity);
            if (force || current is null)
            {
                prop.SetValue(entity, value);
            }
        }
    }
}
