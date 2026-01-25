using NpgsqlTypes;

namespace Backend.Models.DTO
{
    public enum OrderStatus
    {
        [PgName("NEW")]
        New,

        [PgName("IN_PRODUCTION")]
        IN_PRODUCTION,

        [PgName("PACKED")]
        PACKED,

        [PgName("READY_FOR_SHIPMENT")]
        READY_FOR_SHIPMENT,

        [PgName("SHIPPED")]
        SHIPPED,

        [PgName("DELIVERED")]
        DELIVERED,

        [PgName("CANCELLED")]
        CANCELLED

    }
}
