namespace Backend.Models.DTO
{
    public class BatchDto
    {
        public string Id { get; set; } = string.Empty;
        public string BatchNumber { get; set; } = string.Empty;
        public double Quantity { get; set; }
        public string Unit { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? Barcode { get; set; }
        public DateTime CreatedAt { get; set; }

        public string ProductTypeId { get; set; } = string.Empty;
        public string ProductTypeName { get; set; } = string.Empty; 

        public ProductTypeSummaryDto? ProductType { get; set; }

        public List<StockItemDto>? StockItems { get; set; } = new(); 
    }

    public class StockItemDto
    {
        public string Id { get; set; } = string.Empty;
        public double Quantity { get; set; }
        public double Reserved { get; set; }
        public string WarehouseName { get; set; } = string.Empty;
    }
}
