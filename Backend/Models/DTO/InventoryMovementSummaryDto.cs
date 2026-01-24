namespace Backend.Models.DTO
{
    public class InventoryMovementSummaryDto
    {
        public string Id { get; set; } = string.Empty;
        public string BatchId { get; set; } = string.Empty;
        public string BatchNumber { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public double Quantity { get; set; }
        public DateTime Date { get; set; }
        public string? Reason { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string UserEmail { get; set; } = string.Empty;
        public string? FromWarehouseId { get; set; }
        public string? FromWarehouseName { get; set; }
        public string? ToWarehouseId { get; set; }
        public string? ToWarehouseName { get; set; }
    }
}
