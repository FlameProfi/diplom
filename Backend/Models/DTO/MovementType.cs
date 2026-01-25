using NpgsqlTypes;

namespace Backend.Models.DTO
{
    public enum MovementType
    {
        [PgName("RECEIPT")]
        Receipt,

        [PgName("ISSUE")]
        Issue,

        [PgName("RESERVE")]
        Reserve,
        [PgName("WRITE_OFF")]
        Write_OFF,
        [PgName("TRANSFER")]
        Transfer,
        [PgName("CONSUMPTION")]
        Consumption
    }
}
