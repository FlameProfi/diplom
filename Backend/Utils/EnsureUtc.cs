namespace Backend.Utils
{
    public class EnsureUtc
    {
        public static DateTime GoEnsureUtc(DateTime dt)
        {
            return dt.Kind switch
            {
                DateTimeKind.Utc => dt,
                DateTimeKind.Local => dt.ToUniversalTime(),
                _ => DateTime.SpecifyKind(dt, DateTimeKind.Utc) // Unspecified -> считаем что это UTC
            };
        }
    }
}
