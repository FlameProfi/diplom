namespace Backend.Models.DTO
{
    public class InventoryMovementRequestDto
    {
        public string BatchId { get; set; } = string.Empty;
        public string? FromWarehouseId { get; set; }
        public string? ToWarehouseId { get; set; }
        public string Type { get; set; } = string.Empty;
        public double Quantity { get; set; }
        public string? Reason { get; set; }
        public string? UserId { get; set; }
    }

    public class ReserveRequestDto
    {
        public string BatchId { get; set; } = string.Empty;
        public string OrderItemId { get; set; } = string.Empty;
        public double Quantity { get; set; }
        public string? UserId { get; set; }
    }
}
